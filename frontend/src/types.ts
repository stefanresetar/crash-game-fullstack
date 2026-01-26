// src/types.ts

export type GameStatus = 'waiting' | 'running' | 'crashed' | 'connecting';

export interface Bet {
  bet_id: string;
  player: string;
  amount: number;
  currency: string;
  auto_cashout?: number; 
  cashed_out?: boolean;  
  skin?: number;         
  status?: 'active' | 'won' | 'lost'; 
  profit?: number;       
}

export interface GameState {
  status: GameStatus;
  multiplier: number;
  time_left: number; 
  crash_point: number | null;
  history: HistoryItem[];
}

export interface HistoryItem {
  crash: number;
  seed: string;
  hash: string;
}

export interface UserBalance {
  balance: number;
}


