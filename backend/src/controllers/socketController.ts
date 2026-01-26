import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import * as bettingService from '../services/bettingService';
import { gameState, getWelcomeData } from '../services/gameEngine';
import db from '../config/db';
import { fromCents } from '../utils/utils';
import gameEvents from '../events'; 
import { redis } from '../config/redis';

const JWT_SECRET = process.env.JWT_SECRET || 'secretPassword';

const toSafeBigInt = (val: any): bigint => {
    if (typeof val === 'bigint') return val;
    if (typeof val === 'number') return BigInt(Math.trunc(val)); 
    if (typeof val === 'string') {
        const wholePart = val.split('.')[0];
        return BigInt(wholePart);
    }
    return BigInt(0);
};


interface AuthenticatedSocket extends Socket {
    user?: {
        id: number;
        username: string;
    };
}

interface BetBatchItem {
    player: string;
    amount: string | number;
    currency: string;
    bet_id: string;
    skin: number;
}


let betBuffer: BetBatchItem[] = [];

const setupSocket = (io: Server) => {

   
    
    setInterval(() => {
        if (betBuffer.length > 0) {
            io.emit('new_bets_batch', betBuffer);
            betBuffer = [];
        }
    }, 100);
    
    gameEvents.on('user:balance_change', (data: any) => {
        io.emit('user:balance_change', data);
    });

    gameEvents.on('bet:won', (data: any) => {
        io.emit('player_won', data);
    });

    gameEvents.on('cashout:success', (data: any) => {
        io.emit('cashout_success', data);
    });


    io.use((socket: AuthenticatedSocket, next) => {
        const token = socket.handshake.auth.token;
        
        if (!token) {
            return next(new Error("Pristup odbijen: Nedostaje token"));
        }

        jwt.verify(token, JWT_SECRET, (err: any, decoded: any) => {
            if (err) {
                console.log(`[AUTH ERROR] ${err.message}`);
                return next(new Error("Pristup odbijen: Nevazeci token"));
            }
            
            socket.user = { 
                username: decoded.data.username,
                id: decoded.data.id 
            };
            next();
        });
    });


    io.on('connection', async (rawSocket: Socket) => {
        const socket = rawSocket as AuthenticatedSocket;
        
        if (!socket.user) {
            socket.disconnect();
            return;
        }

        const currentUser = socket.user.username;
        const userId = socket.user.id;
        
        const welcomeData = await getWelcomeData();
        socket.emit('welcome', welcomeData);

        socket.on('req_user_data', async () => {
            try {
                const [dbRes, rawMute] = await Promise.all([
                    (async () => {
                        const client = await db.connect();
                        try {
                            return await client.query(
                                'SELECT balance FROM players WHERE playername = $1', 
                                [currentUser]
                            );
                        } finally {
                            client.release();
                        }
                    })(),
                    redis.hGet(`settings:${userId}`, 'muted')
                ]);

                let response: any = {};

                if (dbRes.rows.length > 0) {
                    const row = dbRes.rows[0];
                    const balanceValue = row.balance ?? 0; 
                    const balanceInCents = toSafeBigInt(balanceValue); 
                    
                    response.balance = fromCents(balanceInCents);
                } else {
                    response.balance = 0;
                }

                const isMuted = (rawMute === '1'); 
                response.settings = { muted: isMuted };

                socket.emit('user_data_update', response);

            } catch (e) {
                console.error("Greska pri ucitavanju user_data:", e);
            }
        });

        socket.on('toggle_sound', async (data: { muted: boolean }) => {
            const valToStore = data.muted ? '1' : '0';
            try {
                await redis.hSet(`settings:${userId}`, 'muted', valToStore);
            } catch (e) {
                console.error("Redis save error:", e);
            }
        });

        socket.on('place_bet', async (data: any) => {
            if (gameState.status !== 'waiting') return socket.emit('error', 'Igra je vec pocela');
            
            try {
                const result = await bettingService.processBet(
                    currentUser, 
                    data.amount, 
                    data.currency, 
                    data.auto_cashout,
                    gameState.id
                );
                
                socket.emit('bet_accepted', { 
                    success: true, 
                    bet_id: result.betId, 
                    amount: data.amount, 
                    currency: data.currency 
                });
                
                if (result.betId) {
                    betBuffer.push({
                        player: currentUser,
                        amount: data.amount,
                        currency: data.currency,
                        bet_id: result.betId,
                        skin: 0 
                    });
                }

            } catch (e: any) {
                socket.emit('bet_accepted', { success: false, error: e.message });
            }
        });

        socket.on('cancel_bet', async (data: { bet_id: string }) => {
            try {
                const result = await bettingService.cancelBet(data.bet_id, currentUser, gameState.status);
                
                io.emit('bet_canceled_global', { bet_id: result.betId });
                socket.emit('bet_canceled_success', { bet_id: result.betId });
            } catch (e: any) {
                socket.emit('error', e.message);
            }
        });


        socket.on('cashout', async (data: { bet_id: string }) => {
            if(data.bet_id) {
                try {
                    await bettingService.processCashout(data.bet_id, gameState.multiplier, gameState.status);
                } catch (e) { 
                    console.error("Cashout sync error", e); 
                }
            }
        });
    });
};

export default setupSocket;