import { useEffect } from 'react';
import { socket } from '../socket'; 
import { useGameStore } from '../store/gameStore';

export const useCrash = () => {
  const { 
    setStatus, 
    setMultiplier, 
    setTimeLeft, 
    addHistoryItem, 
    setBalance, 
    addBet,
    setHistory,
    updateBet,
    resetRound
  } = useGameStore();

  useEffect(() => {
    // 1. KONEKCIJA & INICIJALIZACIJA
    const handleConnect = () => {
      console.log("Socket connected - sending request for data.");
      const myUsername = localStorage.getItem('crash_username');
      socket.emit('req_user_data', myUsername);
    };

  
    const handleWelcome = (data: any) => {
      const state = data.gameState || data;
      
      setStatus(state.status);
      setMultiplier(parseFloat(state.multiplier || 1.00));

      if (state.status === 'waiting' && state.time_left !== undefined) {
          setTimeLeft(parseFloat(state.time_left));
      }
      
      if (data.history && Array.isArray(data.history)) {
          const cleanHistory = data.history.map((item: any) => {
              if (typeof item === 'string') {
                  try { return JSON.parse(item); } catch (e) { return null; }
              }
              return item;
          }).filter((i: any) => i !== null);
          setHistory(cleanHistory);
      }
      
      if (data.active_bets) {
          data.active_bets.forEach((bet: any) => addBet(bet));
      }
    };

    
    const handleStateChange = (data: any) => {
      setStatus(data.status);
      if(data.status === 'waiting') {
        resetRound();
        setTimeLeft(data.time_left);
        setMultiplier(1.00);
      }
    };

    
    const handleTick = (serverMult: number) => {
      setMultiplier(serverMult);
    };

  
    const handleCrash = (data: any) => {
      setStatus('crashed');
      let crashValue = typeof data === 'object' ? parseFloat(data.crash || data.multiplier || 0) : parseFloat(data);
      setMultiplier(crashValue);
      addHistoryItem(typeof data === 'object' ? data : { crash: crashValue });
    };

    
    const handleNewBets = (betsList: any[]) => {
       betsList.forEach((bet) => addBet(bet));
    };

    
    const handleBetAccepted = (data: any) => {
        if (data.success) {
            const myUsername = localStorage.getItem('crash_username') || '';
            addBet({
                bet_id: data.bet_id,
                player: myUsername,
                amount: data.amount,
                currency: 'balance', 
                skin: 0,
                status: 'active'
            });
        } else {
            console.error("❌ Opklada odbijena:", data.error);
        }
    };

    
    const handleUserDataUpdate = (data: any) => {
        const rawBalance = data.balance ?? data.novac ?? data.newBalance;
        
        if (rawBalance !== undefined && rawBalance !== null) {
            const parsedBalance = parseFloat(rawBalance as string);
            setBalance({ balance: parsedBalance });
        }
    };

    const handleBalanceChange = (data: any) => {
        if (data.amount !== undefined) {
            setBalance({ balance: parseFloat(data.amount) });
        }
    };

 
    const handlePlayerWon = (data: any) => {
        updateBet(data.bet_id, { status: 'won', profit: data.profit });
    };

    const handleCashoutSuccess = (data: any) => {
      console.log("Cashout success:", data);
      updateBet(data.bet_id || data.betId, { 
          status: 'won', 
          profit: parseFloat(data.profit) 
      });
  
      const newBal = data.newBalance ?? data.balance;
      if (newBal !== undefined) {
          setBalance({ balance: parseFloat(newBal) });
      }
    };

    socket.on('connect', handleConnect);
    socket.on('welcome', handleWelcome);
    socket.on('state_change', handleStateChange);
    socket.on('tick', handleTick);
    socket.on('crash', handleCrash);
    socket.on('new_bets_batch', handleNewBets);
    socket.on('bet_accepted', handleBetAccepted);
    socket.on('user_data_update', handleUserDataUpdate);
    socket.on('balance_change', handleBalanceChange);
    socket.on('player_won', handlePlayerWon);
    socket.on('cashout_success', handleCashoutSuccess);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('welcome', handleWelcome);
      socket.off('state_change', handleStateChange);
      socket.off('tick', handleTick);
      socket.off('crash', handleCrash);
      socket.off('new_bets_batch', handleNewBets);
      socket.off('bet_accepted', handleBetAccepted);
      socket.off('user_data_update', handleUserDataUpdate);
      socket.off('balance_change', handleBalanceChange);
      socket.off('player_won', handlePlayerWon);
      socket.off('cashout_success', handleCashoutSuccess);
    };
  }, [setStatus, setMultiplier, setTimeLeft, addHistoryItem, setBalance, addBet, setHistory, updateBet, resetRound]);

  return null;
};