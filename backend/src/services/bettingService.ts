import db from '../config/db';
import { toCents, fromCents } from '../utils/utils';
import gameEvents from '../events';


interface ActiveBet {
    id: string;
    player: string;
    amount: bigint;
    autoCashout: number;
    currency: string;
    cashedOut: boolean;
    processing: boolean;
}

interface BetResult {
    success: boolean;
    newBalance?: string;
    betId?: string;
    error?: string;
}


const activeBets = new Map<string, ActiveBet>();


export const getActiveBets = (): Map<string, ActiveBet> => activeBets;
export const clearBets = (): void => activeBets.clear();




export async function processBet(
    username: string, 
    amount: number | string, 
    currency: string, 
    autoCashout: number, 
    gameId: number
): Promise<BetResult> {
    
    const client = await db.connect();
    const amountBig = toCents(amount); 
    
    if (amountBig <= 0n) throw new Error("Iznos mora biti pozitivan");

    try {
        await client.query('BEGIN');
        
        
        
        const updateRes = await client.query(
            `UPDATE players 
             SET balance = (balance::NUMERIC - $1::NUMERIC)::BIGINT
             WHERE playername = $2 AND (balance::NUMERIC) >= $1::NUMERIC
             RETURNING balance`, 
            [amountBig.toString(), username]
        );

        if (updateRes.rows.length === 0) {
            const checkUser = await client.query('SELECT 1 FROM players WHERE playername = $1', [username]);
            if (checkUser.rows.length === 0) throw new Error("Korisnik ne postoji");
            throw new Error("Nedovoljno sredstava");
        }

   
        const newBalBig = BigInt(updateRes.rows[0].balance);

       
        const insertRes = await client.query(
            `INSERT INTO crash_bets (game_id, player_name, bet_amount, currency, auto_cashout, cashed_out_at, profit) 
             VALUES ($1, $2, $3, $4, $5, 0, 0) RETURNING id`,
            [gameId, username, amountBig.toString(), currency, autoCashout]
        );

        await client.query('COMMIT');
        
        const betId = insertRes.rows[0].id.toString();

        const newBet: ActiveBet = {
            id: betId,
            player: username,
            amount: amountBig,
            autoCashout: parseFloat(autoCashout.toString()),
            currency: currency,
            cashedOut: false,
            processing: false
        };
        activeBets.set(betId, newBet);

       
        gameEvents.emit('user:balance_change', {
            username: username,
            currency: 'balance',
            amount: fromCents(newBalBig)
        });

        return { 
            success: true, 
            newBalance: fromCents(newBalBig), 
            betId: betId 
        };

    } catch (err: any) {
        await client.query('ROLLBACK');
        if (err.code !== '23505') {
            console.error("BET ERROR:", err.message);
        }
        throw err;
    } finally {
        client.release();
    }
}


export async function cancelBet(
    betId: string | number, 
    username: string, 
    gameStatus: string
): Promise<BetResult> {
    
  
    if (gameStatus !== 'waiting') throw new Error("Kasno za otkazivanje!");

    const betIdStr = betId.toString();
    const bet = activeBets.get(betIdStr);

    if (!bet) throw new Error("Opklada nije pronadjena u memoriji.");
    if (bet.player !== username) throw new Error("Nije tvoja opklada.");

    const client = await db.connect();
    try {
        await client.query('BEGIN');

        const betDbRes = await client.query(
            `SELECT * FROM crash_bets WHERE id = $1 FOR UPDATE`, 
            [betIdStr]
        );
        if (betDbRes.rows.length === 0) throw new Error("Greska u bazi (bet not found).");

        const betDb = betDbRes.rows[0];
        const amountBig = BigInt(betDb.bet_amount);
        
       
        await client.query(
            `UPDATE players SET balance = balance + $1 WHERE playername = $2`, 
            [amountBig.toString(), username]
        );

       
        await client.query(`DELETE FROM crash_bets WHERE id = $1`, [betIdStr]);

        const userRes = await client.query(`SELECT balance FROM players WHERE playername = $1`, [username]);
        const newBal = BigInt(userRes.rows[0].balance);

        await client.query('COMMIT');
        
        activeBets.delete(betIdStr);

        gameEvents.emit('user:balance_change', {
            username: username,
            currency: 'balance',
            amount: fromCents(newBal)
        });

        return { success: true, betId: betIdStr };
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}


export async function settleGame(gameId: number, crashPoint: number): Promise<void> {
    const client = await db.connect();
    try {
        await client.query('BEGIN');

       
        await client.query(
            `UPDATE crash_bets 
             SET cashed_out_at = -2, 
                 profit = -bet_amount 
             WHERE game_id = $1 AND cashed_out_at = 0`,
            [gameId]
        );

        await client.query('COMMIT');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Settle Game Error:", err);
    } finally {
        client.release();
    }
}


export async function processCashout(
    betId: string | number, 
    currentMult: number, 
    gameStatus: string
): Promise<void> {
    
    const betIdStr = betId.toString();
    const bet = activeBets.get(betIdStr);
    
    if (!bet || bet.cashedOut) return;
    if (gameStatus !== 'running') return;

    bet.processing = true; 

    const client = await db.connect();
    try {
        await client.query('BEGIN');
        
        const betDbRes = await client.query(`SELECT * FROM crash_bets WHERE id = $1 FOR UPDATE`, [betIdStr]);
        if (betDbRes.rows.length === 0) throw new Error("Bet not found");
        
        const betDb = betDbRes.rows[0];
        
    if (parseFloat(betDb.profit) > 0) { 
        await client.query('ROLLBACK');
        return;
    }
    const amountBig = BigInt(betDb.bet_amount); 
    const multScaled = BigInt(Math.floor(currentMult * 100));
    const totalPayoutBig = (amountBig * multScaled) / 100n;
    const profitBig = totalPayoutBig - amountBig;

    const profitStr = fromCents(profitBig); 

    await client.query(
        `UPDATE crash_bets SET profit = $1, cashed_out_at = $2 WHERE id = $3`, 
        [profitStr, currentMult, betIdStr]
    );
    
    await client.query(
        `UPDATE players 
         SET balance = (balance::NUMERIC + $1::NUMERIC)::BIGINT 
         WHERE playername = $2`, 
        [totalPayoutBig.toString(), betDb.player_name]
    );
    
    const userRes = await client.query(`SELECT balance FROM players WHERE playername = $1`, [betDb.player_name]);
    const newBalBig = BigInt(userRes.rows[0].balance);

       await client.query('COMMIT');

        bet.cashedOut = true;
        
        const balStr = fromCents(newBalBig);

       
        gameEvents.emit('bet:won', { 
            player: bet.player, 
            profit: profitStr, 
            mult: currentMult, 
            bet_id: betIdStr 
        });

        gameEvents.emit('cashout:success', { 
            betId: betIdStr, 
            profit: profitStr,
            newBalance: balStr
        });
        
        gameEvents.emit('user:balance_change', { 
            username: bet.player, 
            currency: 'balance',
            amount: balStr 
        });

    } catch (err: any) {
        await client.query('ROLLBACK');
        console.error("Cashout Error:", err.message);
        
    } finally {
        client.release();
    }
}


export async function refundStuckBets(gameId: number): Promise<void> {
    const client = await db.connect();
    try {
        await client.query('BEGIN');

        const res = await client.query(
            `SELECT id, player_name, bet_amount 
             FROM crash_bets 
             WHERE cashed_out_at = 0 AND game_id < $1 FOR UPDATE`, 
            [gameId]
        );

        if (res.rows.length === 0) {
            await client.query('ROLLBACK'); 
            return;
        }

        const stuckIds = res.rows.map(row => row.id);
        const refunds = new Map<string, bigint>(); 

        for (const row of res.rows) {
            const amount = BigInt(row.bet_amount);
            const currentTotal = refunds.get(row.player_name) || 0n;
            refunds.set(row.player_name, currentTotal + amount);
        }

        
        await client.query(
            `UPDATE crash_bets SET cashed_out_at = -1 WHERE id = ANY($1::int[])`,
            [stuckIds]
        );

        
        if (refunds.size > 0) {
            for (const [player, amount] of refunds) {
                await client.query(
                    `UPDATE players SET balance = balance + $1 WHERE playername = $2`,
                    [amount.toString(), player]
                );
            }
        }

        await client.query('COMMIT');
        console.log(`[SYSTEM] Refundirano ${stuckIds.length} opklada.`);

    } catch (e) {
        await client.query('ROLLBACK');
        console.error("Refund Error:", e);
    } finally {
        client.release();
    }
}


export async function checkAutoCashouts(currentMult: number, gameStatus: string): Promise<void> {
    
    const promises: Promise<void>[] = [];

    for (const [id, bet] of activeBets) {
        if (!bet.cashedOut && !bet.processing && bet.autoCashout > 1.00 && currentMult >= bet.autoCashout) {
            
            promises.push(processCashout(id, bet.autoCashout, gameStatus));
        }
    }

    
    if (promises.length > 0) {
        await Promise.allSettled(promises);
    }
}
