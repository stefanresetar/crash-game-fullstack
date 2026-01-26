import path from 'path';
import dotenv from 'dotenv';


dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import crypto from 'crypto';
import Cursor from 'pg-cursor';
import { redis, connectRedis } from '../config/redis';
import db from '../config/db';


const CHAIN_SIZE = 1000000;  
const BATCH_SIZE = 2000;     
const HISTORY_SIZE = 30;     
const REDIS_HISTORY_KEY = 'game_history'; 


interface FrontendHistoryItem {
    id: number;
    crash: number;
    time: number;
    hash: string;
    seed: string;
}

export const checkAndSeed = async (): Promise<void> => {
    const client = await db.connect(); 
    
    try {
        console.log("Status: Connecting to Services...");
        
       
        if (!redis.isOpen) {
             console.log("...Redis was closed, connecting now...");
             await connectRedis(); 
        }

       
        console.log("Status: Checking Game History...");
        
        
        const lastGameCheck = await client.query('SELECT MAX(id) as max_id FROM crash_games');
        const lastPlayedId = parseInt(lastGameCheck.rows[0].max_id) || 0;
        console.log(`Info: Last Played Game ID: ${lastPlayedId}`);

        
        const seedCheck = await client.query('SELECT count(*) FROM game_seeds WHERE game_id > $1', [lastPlayedId]);
        const validSeedsCount = parseInt(seedCheck.rows[0].count);

        if (validSeedsCount > 0) {
            
            console.log(`Action: Found ${validSeedsCount} unused seeds. Restoring to Redis...`);
            
            await redis.del('game_hashes'); // Clear old list to avoid duplicates

           
            const queryText = 'SELECT hash FROM game_seeds WHERE game_id > $1 ORDER BY game_id ASC';
            
            
            const cursor = client.query(new Cursor(queryText, [lastPlayedId]));
            
            let rows = await cursor.read(BATCH_SIZE);
            let totalRestored = 0;
            
            while (rows.length > 0) {
                 const hashes: string[] = rows.map((r: any) => r.hash);
                 await redis.rPush('game_hashes', hashes);
                 
                 totalRestored += rows.length;
                 
                
                 process.stdout.write(`\rRestoring Chain... loaded ${totalRestored} seeds`);
                 rows = await cursor.read(BATCH_SIZE);
            }
            console.log(`\nSuccess: CHAIN RESTORED.`);

        } else {
          
            console.log("Warning: No future seeds found! Generating NEW CHAIN...");
            console.log("Action: Cleaning old seeds table...");
            await client.query('TRUNCATE TABLE game_seeds'); 

            
            const secret = crypto.randomBytes(32).toString('hex');
            console.log(`Security: NEW MASTER SECRET: ${secret.substring(0, 10)}...`);

            let chain: string[] = new Array(CHAIN_SIZE);
            let currentHash = secret;

           
            for (let i = 0; i < CHAIN_SIZE; i++) {
                currentHash = crypto.createHash('sha256').update(currentHash).digest('hex');
                chain[i] = currentHash;
            }
            chain.reverse(); 
            
            
            const startGameId = lastPlayedId + 1;
            console.log(`Action: Saving Chain starting from Game ID: ${startGameId}...`);

            for (let i = 0; i < chain.length; i += BATCH_SIZE) {
                const chunk = chain.slice(i, i + BATCH_SIZE);
                
                
                await redis.rPush('game_hashes', chunk);

                
                const values: string[] = [];
                const params: (string | number)[] = [];
                let paramIndex = 1;

                chunk.forEach((hash, index) => {
                    const gameId = startGameId + i + index; 
                    params.push(gameId, hash);
                    values.push(`($${paramIndex}, $${paramIndex + 1})`);
                    paramIndex += 2;
                });

                const query = `INSERT INTO game_seeds (game_id, hash) VALUES ${values.join(',')}`;
                await client.query(query, params);
            }
            console.log("\nSuccess: NEW CHAIN SAVED.");
        }

        
        console.log("Status: Restoring Frontend History...");

        
        const historyQuery = `
            SELECT id, crash_point, hash, created_at 
            FROM crash_games 
            ORDER BY id DESC 
            LIMIT $1
        `;
        const historyRes = await client.query(historyQuery, [HISTORY_SIZE]);

        if (historyRes.rows.length > 0) {
            
            await redis.del(REDIS_HISTORY_KEY);

            
            const games = historyRes.rows;

            for (const game of games) {
               
                const frontendItem: FrontendHistoryItem = {
                    id: game.id,
                    crash: parseFloat(game.crash_point),
                    time: new Date(game.created_at).getTime(), 
                    hash: game.hash,
                    seed: game.hash 
                };

                await redis.rPush(REDIS_HISTORY_KEY, JSON.stringify(frontendItem));
            }
            console.log(`Success: History Restored (${games.length} games).`);
        } else {
            console.log("Info: No history found to restore.");
        }

        console.log("\nSYSTEM FULLY READY.");

    } catch (e) {
        console.error("FATAL ERROR IN SEEDCHAIN:", e);
        throw e; 
    } finally {
        client.release();
    }
};