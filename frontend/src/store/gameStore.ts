import { create } from 'zustand';
import { GameStatus, Bet, HistoryItem } from '../types';


interface UserBalance {
  balance: number;
}

interface GameStore {

  status: GameStatus;
  currentMultiplier: number;
  timeLeft: number;
  history: HistoryItem[];
  
  balance: UserBalance;
  bets: Bet[];
  myBets: Bet[]; 
  
  isMuted: boolean;
  

  setStatus: (status: GameStatus) => void;
  setMultiplier: (mult: number) => void;
  setTimeLeft: (time: number) => void;
  addBet: (bet: Bet) => void;
  updateBet: (betId: string, updates: Partial<Bet>) => void;
  removeBet: (betId: string) => void;
  setHistory: (history: HistoryItem[]) => void;
  addHistoryItem: (item: HistoryItem) => void;
  setBalance: (bal: Partial<UserBalance>) => void; 
  setMuted: (muted: boolean) => void;
  resetRound: () => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  status: 'connecting',
  currentMultiplier: 1.00,
  timeLeft: 0,
  history: [],
  balance: { balance: 0 }, 
  bets: [],
  myBets: [],
  isMuted: false,

  setStatus: (status) => set({ status }),
  setMultiplier: (mult) => set({ currentMultiplier: mult }),
  setTimeLeft: (time) => set({ timeLeft: time }),
  
  addBet: (bet) => set((state) => {
    if (state.bets.find(b => b.bet_id === bet.bet_id)) return state;
    
    const myUsername = localStorage.getItem('crash_username');

    return { 
      bets: [bet, ...state.bets],
      myBets: bet.player === myUsername 
        ? [...state.myBets, bet] 
        : state.myBets
    };
  }),

  updateBet: (betId, updates) => set((state) => ({
    bets: state.bets.map(b => b.bet_id === betId ? { ...b, ...updates } : b),
    myBets: state.myBets.map(b => b.bet_id === betId ? { ...b, ...updates } : b)
  })),

  removeBet: (betId) => set((state) => ({
    bets: state.bets.filter(b => b.bet_id !== betId),
    myBets: state.myBets.filter(b => b.bet_id !== betId)
  })),

  setHistory: (history) => set({ history }),
  
  addHistoryItem: (item) => set((state) => ({
    history: [item, ...state.history].slice(0, 20)
  })),


  setBalance: (newBal) => set((state) => ({
    balance: { ...state.balance, ...newBal }
  })),

  setMuted: (muted) => set({ isMuted: muted }),

  resetRound: () => set({ 
    bets: [], 
    myBets: [], 
    currentMultiplier: 1.00,
    status: 'waiting'
  })
}));