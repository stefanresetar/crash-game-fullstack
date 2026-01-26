import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FaCoins, FaRocket, FaHandHoldingUsd } from 'react-icons/fa';
import { useGameStore } from '../store/gameStore';
import { socket } from '../socket';

export const BettingPanel: React.FC = () => {
    const { status, balance, currentMultiplier, myBets } = useGameStore();
    const [amount, setAmount] = useState<number>(10);
    const [autoCashout, setAutoCashout] = useState<string>("2.00");

    const hasActiveBet = myBets.length > 0 && !myBets[0].cashed_out;
    const isCashedOut = myBets.length > 0 && myBets[0].cashed_out;

    const handlePlaceBet = () => {
        if (amount <= 0 || amount > balance.balance) return;
        
        socket.emit('place_bet', { 
            amount, 
            auto_cashout: parseFloat(autoCashout) 
        });
    };

    const handleCashout = () => {
        if (hasActiveBet) {
            socket.emit('cashout', { 
                bet_id: myBets[0].bet_id, 
                current_mult: currentMultiplier 
            });
        }
    };

    const quickAdjust = (type: 'half' | 'double' | 'max') => {
        if (type === 'half') setAmount(prev => Math.floor(prev / 2));
        if (type === 'double') setAmount(prev => prev * 2);
        if (type === 'max') setAmount(balance.balance);
    };

    return (
        <div className="flex flex-col gap-6 p-1">
            <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-[#718096]">
                    <span>Iznos Uloga</span>
                    <span className="text-[#48bb78]">${balance.balance.toLocaleString()}</span>
                </div>
                <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#ff6b00]">
                        <FaCoins />
                    </div>
                    <input 
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(Number(e.target.value))}
                        className="w-full bg-[#0f1115] border border-[#2d3748] rounded-xl py-3 pl-12 pr-4 text-white font-bold outline-none focus:border-[#ff6b00] transition-all"
                    />
                </div>
                <div className="grid grid-cols-3 gap-2">
                    <button onClick={() => quickAdjust('half')} className="bg-[#2d3748] hover:bg-[#3d4859] py-1.5 rounded-lg text-xs font-bold transition-colors">1/2</button>
                    <button onClick={() => quickAdjust('double')} className="bg-[#2d3748] hover:bg-[#3d4859] py-1.5 rounded-lg text-xs font-bold transition-colors">x2</button>
                    <button onClick={() => quickAdjust('max')} className="bg-[#2d3748] hover:bg-[#3d4859] py-1.5 rounded-lg text-xs font-bold transition-colors">MAX</button>
                </div>
            </div>

            <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-[#718096]">Auto Isplata (Opciono)</label>
                <div className="relative">
                    <input 
                        type="text"
                        value={autoCashout}
                        onChange={(e) => setAutoCashout(e.target.value)}
                        placeholder="2.00x"
                        className="w-full bg-[#0f1115] border border-[#2d3748] rounded-xl py-3 px-4 text-white font-bold outline-none focus:border-[#ff6b00] transition-all"
                    />
                </div>
            </div>

            <div className="pt-4">
                {!hasActiveBet ? (
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        disabled={status === 'running' || amount > balance.balance}
                        onClick={handlePlaceBet}
                        className={`btn-game flex flex-col items-center justify-center shadow-lg transition-all
                            ${status === 'waiting' 
                                ? 'bg-gradient-to-b from-[#ff6b00] to-[#dd5e00] shadow-[#ff6b00]/20' 
                                : 'bg-[#2d3748] text-[#718096] cursor-not-allowed opacity-50'}
                        `}
                    >
                        <span className="text-xl font-black">ULOG</span>
                        <span className="text-[10px] opacity-70">
                            {status === 'running' ? 'SAČEKAJ KRAJ' : 'SLEDEĆA RUNDA'}
                        </span>
                    </motion.button>
                ) : (
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        animate={{ boxShadow: ["0 0 0px #48bb78", "0 0 20px #48bb78", "0 0 0px #48bb78"] }}
                        transition={{ repeat: Infinity, duration: 2 }}
                        onClick={handleCashout}
                        className="btn-game bg-gradient-to-b from-[#48bb78] to-[#2f855a] shadow-lg flex flex-col items-center justify-center"
                    >
                        <span className="text-xl font-black italic">ISPLATI</span>
                        <span className="text-sm font-bold">${(amount * currentMultiplier).toFixed(2)}</span>
                    </motion.button>
                )}
                
                {isCashedOut && (
                    <div className="mt-4 p-3 bg-green-900/20 border border-green-500/30 rounded-xl text-center">
                        <span className="text-green-500 font-bold text-sm">USPEŠNA ISPLATA! 🎉</span>
                    </div>
                )}
            </div>
        </div>
    );
};