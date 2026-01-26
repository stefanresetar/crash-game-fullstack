import { EventEmitter } from 'events';
interface GameEvents {
    'user:balance_change': (data: { username: string; currency: string; amount: string }) => void;
    'bet:won': (data: { player: string; profit: string; mult: number; bet_id: string }) => void;
   
    'cashout:success': (data: { betId: string; profit: string; newBalance?: string }) => void;
    'new_bets_batch': (data: any[]) => void;
}
declare interface TypedEventEmitter {
    on<U extends keyof GameEvents>(event: U, listener: GameEvents[U]): this;
    emit<U extends keyof GameEvents>(event: U, ...args: Parameters<GameEvents[U]>): boolean;
    
    off<U extends keyof GameEvents>(event: U, listener: GameEvents[U]): this;
}
class GameEventEmitter extends EventEmitter {}
const gameEvents = new GameEventEmitter() as TypedEventEmitter;
export default gameEvents;