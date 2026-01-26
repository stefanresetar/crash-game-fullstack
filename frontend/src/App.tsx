import React, { useEffect, useState } from 'react';
import { socket } from './socket';
import { CrashCanvas } from './components/CrashCanvas';
import { LoginForm } from './components/LoginForm';
import { HistoryBar } from './components/HistoryBar'; 
import { FaSignOutAlt, FaWallet, FaUserCircle, FaCoins, FaRobot } from 'react-icons/fa';
import { useCrash } from './hooks/useCrash';
import { useGameStore } from './store/gameStore';

function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('crash_token'));
  const [username, setUsername] = useState<string | null>(localStorage.getItem('crash_username'));
  const [isSocketConnected, setIsSocketConnected] = useState(false);

  const [betAmount, setBetAmount] = useState<string>('');
  const [autoCashout, setAutoCashout] = useState<string>('');

  const { balance: balanceObj, status, bets, myBets, currentMultiplier, setBalance } = useGameStore();
  

  const currentBalance = balanceObj?.balance ?? 0;
  
  useCrash();


  useEffect(() => {
    if (token) {
        socket.auth = { token };
        socket.connect();

        const onConnect = () => {
            setIsSocketConnected(true);
            socket.emit('req_user_data');
        };

        const onDisconnect = () => setIsSocketConnected(false);

        socket.on('user_data_update', (data: any) => {
            if (data.balance !== undefined) {
                setBalance({ balance: Number(data.balance) });
            }
        });

        socket.on('balance_update_global', (data: any) => {
            if (data.username === username) {
                 setBalance({ balance: Number(data.newBalance || data.balance) });
            }
        });

        socket.on('user:balance_change', (data: any) => {
            if (data.username === username) {

                const newBal = Number(data.amount);
                if (!isNaN(newBal)) {
                    setBalance({ balance: newBal });
                }
            }
        });

        const onError = (err: any) => {
            console.error("Socket Error:", err);
            if(err.message === "Nevazeci token" || err.message === "Authentication error") {
                handleLogout();
            }
        };

        socket.on('connect', onConnect);
        socket.on('disconnect', onDisconnect);
        socket.on('connect_error', onError);

        return () => {
            socket.off('connect', onConnect);
            socket.off('disconnect', onDisconnect);
            socket.off('connect_error', onError);
            
            socket.off('user_data_update');
            socket.off('balance_update_global');
            socket.off('user:balance_change'); // Obavezno gasimo listener
            
            socket.disconnect();
        };
    }
  }, [token, username, setBalance]);


  const handleLogout = () => {
      localStorage.removeItem('crash_token');
      localStorage.removeItem('crash_username');
      setToken(null);
      socket.disconnect();
  };

  const handlePlaceBet = () => {
      const amount = parseFloat(betAmount);
      const auto = parseFloat(autoCashout) || 0;

      if (!amount || amount <= 0) return alert("Unesite validan iznos!");
      if (amount > currentBalance) return alert("Nemate dovoljno novca u džepu!");

  
      setBalance({ balance: Number(currentBalance) - amount });

      socket.emit('place_bet', { 
        amount: amount, 
        currency: 'balance', 
        auto_cashout: auto 
    });
  };

  const handleCashout = () => {
      const myBet = myBets.find(b => !b.cashed_out);
      if (myBet) {
          socket.emit('cashout', { bet_id: myBet.bet_id });
          
      }
  };

 
  const renderMainButton = () => {
    const activeBet = myBets.find(b => b.status === 'active' || !b.cashed_out);
    const wonBet = myBets.find(b => b.status === 'won');

    if (status === 'running') {
       
        if (wonBet) {
            return (
                <button disabled className="w-full bg-green-500 text-black font-bold py-4 rounded shadow-[0_0_20px_rgba(72,187,120,0.6)] uppercase tracking-wider text-xl border-b-4 border-green-700 opacity-100 cursor-default">
                    <div className="flex flex-col leading-none">
                        <span>ISPLAĆENO</span>
                        <span className="text-sm font-mono mt-1">+${Number(wonBet.profit || 0).toFixed(2)}</span>
                    </div>
                </button>
            );
        }

        
        if (activeBet && !wonBet) {
            const amt = Number(activeBet.amount || 0);
            const currentProfit = (amt * currentMultiplier).toFixed(2);
            
            return (
                <button onClick={handleCashout} className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 rounded shadow-[0_0_20px_rgba(237,137,54,0.4)] transition uppercase tracking-wider text-xl border-b-4 border-orange-700 active:border-b-0 active:translate-y-1">
                    <div className="flex flex-col leading-none">
                        <span>ISPLATI</span>
                        <span className="text-sm text-yellow-200 mt-1 font-mono">+${currentProfit}</span>
                    </div>
                </button>
            );
        } 
        
        
        return (
            <button disabled className="w-full bg-gray-700 text-gray-400 font-bold py-4 rounded cursor-not-allowed uppercase tracking-wider text-xl">
                IGRA U TOKU...
            </button>
        );
    }


    if (status === 'crashed') {
        return (
            <button disabled className="w-full bg-red-900/50 text-red-500 font-bold py-4 rounded cursor-not-allowed uppercase tracking-wider text-xl border border-red-900">
                SAČEKAJ SLEDEĆU...
            </button>
        );
    }

    
    if (activeBet) {
        return (
          <button disabled className="w-full bg-blue-600 text-white font-bold py-4 rounded uppercase tracking-wider text-xl opacity-80 flex flex-col items-center justify-center">
              <span>ULOG PRIHVAĆEN</span>
              <span className="text-xs font-mono mt-1">Srećno!</span>
          </button>
        );
    }

   
    return (
        <button onClick={handlePlaceBet} className="w-full bg-green-500 hover:bg-green-600 text-black font-bold py-4 rounded shadow-[0_0_20px_rgba(72,187,120,0.4)] transition uppercase tracking-wider text-xl border-b-4 border-green-700 active:border-b-0 active:translate-y-1">
            POSTAVI ULOG
        </button>
    );
};

  if (!token) return <LoginForm />;

  return (
    <div className="h-screen bg-[#0f1115] text-white font-rajdhani flex flex-col overflow-hidden">
      
      <header className="h-[70px] bg-[#1a1c23] border-b border-[#2d3748] px-6 flex items-center justify-between shadow-lg z-20 shrink-0">
          <div className="flex items-center gap-4">
              <div className="text-2xl font-extrabold tracking-wider">
                  CRASH <span className="text-[#ff6b00]">GAMBLE</span>
              </div>
              <div className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider border ${isSocketConnected ? 'border-green-900 bg-green-900/20 text-green-500' : 'border-red-900 bg-red-900/20 text-red-500'}`}>
                  {isSocketConnected ? 'System Online' : 'Reconnecting...'}
              </div>
          </div>

          <div className="flex items-center gap-6">
                <div className="flex items-center bg-[#0f1115] border border-[#2d3748] rounded px-4 py-2 gap-3 shadow-inner">
                    <div className="flex flex-col items-end leading-none">
                        <span className="text-[10px] text-gray-500 uppercase font-bold mb-1">Balance</span>
                        {/* FIX: Dodato || 0 da spreci NaN prikaz ako je balans null */}
                        <span className="text-[#48bb78] font-mono font-bold text-lg">
                             ${(Number(currentBalance) || 0).toFixed(2)}
                        </span>
                    </div>
                    <FaWallet className="text-[#48bb78] text-xl" />
                </div>

              <div className="flex items-center gap-3 pl-6 border-l border-[#2d3748]">
                  <div className="text-right hidden sm:block">
                      <div className="text-sm font-bold text-white">{username}</div>
                  </div>
                  <FaUserCircle className="text-3xl text-[#4a5568]" />
                  <button onClick={handleLogout} className="ml-2 text-[#718096] hover:text-[#e53e3e] transition-colors">
                    <FaSignOutAlt />
                  </button>
              </div>
          </div>
      </header>

      <main className="flex-1 flex overflow-hidden bg-[#0a0b0d]">
          <div className="flex-1 flex flex-col min-w-0 bg-[#000]">
              <div className="h-[40px] shrink-0 border-b border-[#2d3748] bg-[#15171e]">
                <HistoryBar />
              </div>

              <div className="flex-1 p-4 md:p-8 flex items-center justify-center overflow-hidden">
                <div className="w-full h-full max-w-[1200px] max-h-[750px] relative rounded-2xl border border-[#2d3748] overflow-hidden shadow-2xl bg-radial-dark">
                  <CrashCanvas />
                </div>
              </div>
          </div>

          <div className="w-[350px] bg-[#1a1c23] border-l border-[#2d3748] flex flex-col z-10 shrink-0">
              <div className="p-5 border-b border-[#2d3748] bg-[#1f2229]">
                  <div className="flex gap-3 mb-4">
                      <div className="flex-1">
                          <label className="text-[10px] text-gray-500 font-bold uppercase mb-1 block">Ulog ($)</label>
                          <div className="relative">
                              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"><FaCoins /></div>
                              <input 
                                type="number" 
                                value={betAmount}
                                onChange={(e) => setBetAmount(e.target.value)}
                                className="w-full bg-[#0f1115] border border-[#2d3748] rounded p-2.5 pl-9 text-white font-bold focus:border-[#ff6b00] outline-none transition"
                                placeholder="0.00"
                              />
                          </div>
                      </div>
                      <div className="w-[100px]">
                          <label className="text-[10px] text-gray-500 font-bold uppercase mb-1 block">Auto (x)</label>
                          <div className="relative">
                              <div className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500"><FaRobot /></div>
                              <input 
                                type="number" 
                                value={autoCashout}
                                onChange={(e) => setAutoCashout(e.target.value)}
                                className="w-full bg-[#0f1115] border border-[#2d3748] rounded p-2.5 pl-7 text-white font-bold focus:border-[#ff6b00] outline-none transition"
                                placeholder="2.00"
                              />
                          </div>
                      </div>
                  </div>

                  {renderMainButton()}
              </div>

              <div className="bg-[#15171e] py-2 px-4 flex justify-between text-[10px] text-gray-500 font-bold uppercase tracking-wider border-b border-[#2d3748]">
                  <span>Igrač</span>
                  <span>Ulog / Profit</span>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar">
                  {bets.length === 0 ? (
                      <div className="text-center text-gray-600 text-xs py-10 italic">Nema opklada za ovu rundu</div>
                  ) : (
                      bets.map((bet) => (
                          <div 
                            key={bet.bet_id} 
                            className={`flex justify-between items-center py-2 px-4 border-b border-[#2d3748]/50 
                                ${bet.player === username ? 'bg-[#2d3748]/30 border-l-2 border-l-[#ff6b00]' : ''}
                                ${bet.status === 'won' ? 'bg-green-900/10' : ''}
                            `}
                          >
                              <div className="flex items-center gap-3">
                                  <img 
                                    src={`/assets/img/skins/${bet.skin || 0}.png`} 
                                    alt="skin" 
                                    className="w-8 h-8 rounded bg-[#0f1115] border border-[#2d3748]"
                                    onError={(e) => {e.currentTarget.src = 'https://via.placeholder.com/32'}} 
                                  />
                                  <span className={`text-sm font-bold ${bet.player === username ? 'text-white' : 'text-gray-400'}`}>
                                      {bet.player}
                                  </span>
                              </div>

                              <div className="text-right">
                                  {bet.status === 'won' ? (
                                      <div className="flex flex-col">
                                          <span className="text-green-500 font-bold text-sm">+${Number(bet.profit || 0).toFixed(2)}</span>
                                          <span className="text-[10px] text-green-700 font-mono">Won</span>
                                      </div>
                                  ) : (
                                      <div className="flex flex-col">
                                          <span className="text-white font-bold text-sm">${Number(bet.amount || 0).toFixed(2)}</span>
                                          <span className="text-[10px] text-gray-600 font-mono">Bet</span>
                                      </div>
                                  )}
                              </div>
                          </div>
                      ))
                  )}
              </div>
              
              <div className="p-3 bg-[#15171e] border-t border-[#2d3748] flex justify-between items-center text-xs">
                    <span className="text-gray-500">{bets.length} Igrača</span>
                    <span className="text-gray-400 font-mono">
                        Total: <span className="text-white font-bold">${bets.reduce((acc, b) => acc + Number(b.amount || 0), 0).toFixed(2)}</span>
                    </span>
              </div>
          </div>
      </main>
    </div>
  );
}

export default App;