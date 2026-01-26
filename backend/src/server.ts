import dotenv from 'dotenv';
dotenv.config();
import express, { Express } from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import db from './config/db'; 
import * as bettingService from './services/bettingService';
import { connectRedis } from './config/redis';
import { initEngine, triggerGracefulShutdown, gameState } from './services/gameEngine';
import setupSocket from './controllers/socketController';
import { checkAndSeed } from './scripts/seedChain';
import { login } from './controllers/authController'; 
const app: Express = express();
app.use(express.json()); 
app.use(cors());
app.post('/api/login', login);
const server = createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
        credentials: true 
    },
    transports: ['polling', 'websocket'], 
    allowEIO3: true
});

(async (): Promise<void> => {
    try {
        process.on('SIGINT', () => {
            console.log('\nSingal confirmed.');
            if (gameState.status === 'waiting') {
                console.log('Game stopped immediately');
                process.exit(0);
            } else {
                console.log('?? Currently game is active, waiting for end...');
                triggerGracefulShutdown(); 
            }
        });

        await connectRedis();
        console.log("Verifying Hash Chain (Seed Check)...");
        await checkAndSeed();
        
        
        setupSocket(io);

       
        console.log("Performing System Integrity Check & Refund...");

        const gamesRes = await db.query("SELECT MAX(id) as max_id FROM crash_games");
        const maxGameId: number = parseInt(gamesRes.rows[0].max_id) || 0;

        const betsRes = await db.query("SELECT MAX(game_id) as max_id FROM crash_bets");
        const maxBetId: number = parseInt(betsRes.rows[0].max_id) || 0;

        const absoluteMax: number = Math.max(maxGameId, maxBetId);
        const nextGameId: number = absoluteMax + 1;

        console.log(`?? Diagnostic: GameTable Max=${maxGameId}, BetTable Max=${maxBetId}. Next Game will be #${nextGameId}`);

        if (absoluteMax > 0) {
            await db.query("SELECT setval('crash_games_id_seq', $1, true)", [absoluteMax]);
            console.log("?? Database Sequence Auto-Corrected.");
        }

        await bettingService.refundStuckBets(nextGameId);
        console.log("? Integrity Check Complete. System Synchronized.");

      
        initEngine(io);

      
        const PORT: number = 8443;
        server.listen(PORT, () => console.log(`?? ENGINE READY (TypeScript) ON ${PORT}`));

    } catch (e) {
        console.error("FATAL ERROR STARTING SERVER:", e);
        process.exit(1);
    }
})();