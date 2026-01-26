import { Server } from 'socket.io';
import { redis } from '../config/redis';
import db from '../config/db';
import * as bettingService from './bettingService';
import { fromCents } from '../utils/utils';

// --- TYPE DEFINITIONS ---

interface GameSettings {
    waitingTime: number;
    houseEdge: number;
    maxCrash: number;
}

export interface GameState {
    status: 'waiting' | 'running' | 'crashed';
    id: number;
    multiplier: number;
    startTime: number;
    crashPoint: number;
    timeLeft: number;
    seed: string;
    hash: string;
}

interface HistoryItem {
    id: number;
    crash: number;
    time: number;
    hash: string;
    seed: string;
}

interface ActiveBetDTO {
    bet_id: string;
    player: string;
    amount: string; // fromCents returns string usually
    currency: string;
    cashed_out: boolean;
}

interface WelcomeData {
    status: string;
    time_left: number;
    multiplier: number;
    history: HistoryItem[];
    active_bets: ActiveBetDTO[];
    min_bet: number;
    max_bet: number;
    gameState?: GameState; 
}

// --- CONFIG & STATE ---

const GAME_SETTINGS: GameSettings = { 
    waitingTime: 10, 
    houseEdge: 0.04, 
    maxCrash: 10000.00 
};

let STOP_REQUESTED = false; 

// Funkcija koju server.ts poziva kad PM2 pošalje signal
export const triggerGracefulShutdown = (): void => {
    console.log("⚠️ ENGINE: Request received for shutting down service. Waiting end of the round...");
    STOP_REQUESTED = true;
};

export let gameState: GameState = {
    status: 'waiting',
    id: 0, 
    multiplier: 1.00,
    startTime: 0,
    crashPoint: 0,
    timeLeft: GAME_SETTINGS.waitingTime,
    seed: '', 
    hash: ''  
};

// --- HELPER FUNCTIONS ---

function calculateCrashPoint(gameHash: string): number {
    const h = parseInt(gameHash.slice(0, 13), 16);
    const e = 2 ** 52;

    // Instant crash (1/25 šansa)
    if (h % 25 === 0) {
        return 1.00;
    }

    const result = Math.floor((100 * e - h) / (e - h)) / 100;
    const finalCrash = Math.min(result, GAME_SETTINGS.maxCrash);
    
    return Math.max(1.00, finalCrash);
}

export const getWelcomeData = async (): Promise<WelcomeData> => {
    let history: HistoryItem[] = [];
    
    // 1. Čupanje istorije iz Redisa
    if(redis.isOpen) {
        try {
            // Uzimamo poslednjih 20 rezultata
            const raw = await redis.lRange('game_history', 0, 19);
            history = raw.map(item => JSON.parse(item));
        } catch (error) {
            console.error("Greška pri čitanju istorije iz Redisa:", error);
            history = [];
        }
    }
    
    // 2. Mapiranje aktivnih opklada (da frontend zna ko je u igri nakon refresha)
    const activeBets: ActiveBetDTO[] = Array.from(bettingService.getActiveBets().values()).map(b => ({
        bet_id: b.id, 
        player: b.player, 
        amount: fromCents(b.amount), 
        currency: b.currency, 
        cashed_out: b.cashedOut     
    }));

    // 3. POVRATNI OBJEKAT ZA REFRESH
    return {
        // Šaljemo "flat" strukturu koju tvoj useCrash.ts očekuje
        status: gameState.status,
        
        // BITNO: Ako je status 'waiting', šaljemo preostale sekunde. 
        // Osiguraj da tvoj gameState.timeLeft na backendu zapravo opada!
        time_left: gameState.status === 'waiting' ? parseFloat(gameState.timeLeft.toString()) : 0,
        
        multiplier: parseFloat(gameState.multiplier.toString()) || 1.00,
        history: history,
        active_bets: activeBets,
        min_bet: 10, 
        max_bet: 1000000
    };
};

// --- MAIN ENGINE LOGIC ---

export const initEngine = async (io: Server): Promise<void> => {
    
    // Provera da li uopšte imamo haševa pre nego što počnemo
    const hashCount = await redis.lLen('game_hashes');
    if (hashCount === 0) {
        console.error("❌ GREŠKA: Nema haševa u Redisu! Pokreni seeder skriptu prvo.");
        process.exit(1); 
    }
    console.log(`✅ Engine startovan. Preostalo haševa: ${hashCount}`);

    // Čišćenje istorije pri restartu (Log only)
    if (redis.isOpen) {
        const historyLen = await redis.lLen('game_history');
        console.log(`[REDIS] Engine startovan. Učitana istorija: ${historyLen} igara.`);
    }
    
    const startGameCycle = async (): Promise<void> => {
        bettingService.clearBets(); // Čistimo opklade iz memorije

        // 1. Uzimamo hash iz Redisa
        const gameHash = await redis.lPop('game_hashes');

        if (!gameHash) {
            console.error("⛔ KRAJ LANCA! Nema više haševa.");
            io.emit('error', 'Maintenance: Chain Ended');
            return; 
        }

        // 2. Računamo Crash Point
        const crashPoint = calculateCrashPoint(gameHash);

        // 3. Upisujemo igru u PostgreSQL ODMAH na početku (za Refund System)
        try {
            const dbRes = await db.query(
                `INSERT INTO crash_games (crash_point, hash, salt) VALUES ($1, $2, $3) RETURNING id`,
                [crashPoint, gameHash, 'chain_secret'] 
            );
            gameState.id = dbRes.rows[0].id; 
        } catch (dbErr) {
            console.error("⚠️ DB ERROR: Failed to create game", dbErr);
            // Fallback ako baza pukne (da igra ne stane, koristimo timestamp)
            gameState.id = Math.floor(Date.now() / 1000); 
        }

        // --- CHECK GRACEFUL SHUTDOWN (Pre početka) ---
        if (STOP_REQUESTED) {
            console.log("🛑 ENGINE: Round finished (before start). Shutting down process.");
            process.exit(0); 
        }

        // Reset State
        gameState.status = 'waiting';
        gameState.timeLeft = GAME_SETTINGS.waitingTime;
        gameState.multiplier = 1.00;
        gameState.crashPoint = crashPoint;
        gameState.hash = gameHash;
        gameState.seed = gameHash; 

        console.log(`🎰 [GAME #${gameState.id}] Hash: ${gameHash.substring(0, 10)}... | Crash: ${gameState.crashPoint}x`);

        // Emitujemo RESET UI
        io.emit('state_change', {
            id: gameState.id,
            status: 'waiting',
            time_left: gameState.timeLeft,
            multiplier: 1.00
        });
        
        const welcomeData = await getWelcomeData();
        io.emit('welcome', welcomeData);

        let countdownStart = Date.now();
        const waitingLoop = setInterval(() => {
            let elapsed = (Date.now() - countdownStart) / 1000;
            gameState.timeLeft = Math.max(0, GAME_SETTINGS.waitingTime - elapsed);
            
            if (gameState.timeLeft <= 0) {
                clearInterval(waitingLoop);
                runGamePhysics(io);
            } 
        }, 100);
    };

    const runGamePhysics = (io: Server): void => {
        gameState.status = 'running';
        gameState.startTime = Date.now();
        
        io.emit('state_change', {
            id: gameState.id, 
            status: 'running', 
            time_left: 0, 
            multiplier: 1.00,
            start_time: gameState.startTime
        });

        const loop = setInterval(() => {
            const now = Date.now();
            const elapsedSeconds = (now - gameState.startTime) / 1000;
            gameState.multiplier = Math.floor(Math.pow(Math.E, 0.06 * elapsedSeconds) * 100) / 100;

            if (gameState.multiplier >= gameState.crashPoint) {
                gameState.multiplier = gameState.crashPoint;
                clearInterval(loop);
                handleCrash(io);
            } else {
                io.emit('tick', gameState.multiplier);
                // Proveravamo auto-cashout svakog tiketa
                bettingService.checkAutoCashouts(gameState.multiplier, gameState.status);
            }
        }, 30);
    };

    const handleCrash = async (io: Server): Promise<void> => {
        gameState.status = 'crashed';
        io.emit('crash', gameState.crashPoint);
        console.log(`Crashed at  ${gameState.crashPoint}x`);
        
        // Settle bets asynchronously
        bettingService.settleGame(gameState.id, gameState.crashPoint).catch(console.error); 
        
        // PRIPREMA PODATAKA ZA ISTORIJU
        const historyItem: HistoryItem = { 
            id: gameState.id, 
            crash: gameState.crashPoint, 
            time: Date.now(),
            hash: gameState.hash,     
            seed: gameState.hash      
        };

        // Upisujemo u Redis
        if (redis.isOpen) {
            await redis.lPush('game_history', JSON.stringify(historyItem));
            await redis.lTrim('game_history', 0, 49);
        }
        
        io.emit('history_update', historyItem);
        
        // --- CHECK GRACEFUL SHUTDOWN (Na kraju) ---
        if (STOP_REQUESTED) {
            console.log("🛑 ENGINE: Round finished. Shutting down process.");
            process.exit(0); 
        }

        setTimeout(startGameCycle, 5000);
    };

    // Pokreni prvu rundu
    startGameCycle();
};