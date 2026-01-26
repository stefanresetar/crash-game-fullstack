import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaTimes, FaCopy, FaCheck, FaShieldAlt, FaExternalLinkAlt } from 'react-icons/fa';
import { useGameStore } from '../store/gameStore';
import { HistoryItem } from '../types';

export const HistoryBar: React.FC = () => {
  const history = useGameStore((state) => state.history);
  const [selectedRound, setSelectedRound] = useState<HistoryItem | null>(null);


  const getBadgeStyle = (value: number) => {
    if (value >= 50) return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50 shadow-[0_0_10px_rgba(234,179,8,0.2)]';
    if (value >= 10) return 'bg-purple-500/20 text-purple-400 border-purple-500/50 shadow-[0_0_10px_rgba(168,85,247,0.2)]';
    if (value >= 2) return 'bg-green-500/20 text-green-400 border-green-500/50 shadow-[0_0_10px_rgba(74,222,128,0.2)]';
    return 'bg-gray-700/40 text-gray-400 border-gray-600/50';
  };

  return (
    <>
      <div className="h-10 w-full bg-[#15171e] border-b border-[#2d3748] flex items-center px-2 overflow-hidden relative z-30">
        
        <div 
            className="flex gap-2 items-center w-full overflow-x-auto no-scrollbar pr-4"
            style={{ 
                maskImage: 'linear-gradient(to right, black 90%, transparent 100%)',
                WebkitMaskImage: 'linear-gradient(to right, black 90%, transparent 100%)' 
            }}
        >
            <AnimatePresence initial={false}>
                {history.map((item, index) => (
                    <motion.button
                        key={`${item.hash}-${index}`} 
                        layout
                        initial={{ opacity: 0, x: -20, scale: 0.8 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0 }}
                        onClick={() => setSelectedRound(item)}
                        className={`
                            px-3 py-1 rounded min-w-[60px] text-xs font-bold font-mono border transition-all hover:brightness-125 flex-shrink-0
                            ${getBadgeStyle(item.crash)}
                        `}
                    >
                        {item.crash.toFixed(2)}x
                    </motion.button>
                ))}
            </AnimatePresence>
            
            {history.length === 0 && (
                <div className="text-[10px] text-gray-600 uppercase tracking-widest ml-2 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-gray-600 animate-pulse"></div>
                    Čekam istoriju...
                </div>
            )}
        </div>
        
      </div>

     
      <AnimatePresence>
        {selectedRound && (
          <RoundDetailsModal 
            round={selectedRound} 
            onClose={() => setSelectedRound(null)} 
          />
        )}
      </AnimatePresence>
    </>
  );
};


const RoundDetailsModal: React.FC<{ round: HistoryItem; onClose: () => void }> = ({ round, onClose }) => {
    const [copiedHash, setCopiedHash] = useState(false);
    const [copiedSeed, setCopiedSeed] = useState(false);

    const handleCopy = (text: string, setCopied: (v: boolean) => void) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="bg-[#1a1c23] border border-[#2d3748] w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden"
                onClick={(e) => e.stopPropagation()} 
            >
                
                <div className="flex justify-between items-center p-5 border-b border-[#2d3748] bg-[#22252e]">
                    <div className="flex items-center gap-3">
                        <FaShieldAlt className="text-green-500 text-xl" />
                        <h3 className="font-bold text-white tracking-wide uppercase text-sm">Provably Fair</h3>
                    </div>
                    <button onClick={onClose} className="text-gray-500 hover:text-white transition">
                        <FaTimes />
                    </button>
                </div>

                
                <div className="p-6 space-y-6">
                    
                    
                    <div className="text-center">
                        <div className="text-xs text-gray-500 uppercase tracking-widest mb-2">Round Results</div>
                        <div className={`text-5xl font-black ${round.crash >= 2 ? 'text-green-400' : 'text-red-400'}`}>
                            {round.crash.toFixed(2)}x
                        </div>
                    </div>

                  
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-gray-500 uppercase flex justify-between">
                            <span>Hash</span>
                            {copiedHash && <span className="text-green-500 flex items-center gap-1"><FaCheck /> Copied</span>}
                        </label>
                        <div className="relative group">
                            <input 
                                readOnly 
                                value={round.hash} 
                                className="w-full bg-[#0f1115] border border-[#2d3748] text-gray-300 text-xs p-3 rounded font-mono outline-none focus:border-green-500 transition pr-10"
                            />
                            <button 
                                onClick={() => handleCopy(round.hash, setCopiedHash)}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white p-1"
                            >
                                <FaCopy />
                            </button>
                        </div>
                    </div>

                    
                    
                    <div className="pt-4 border-t border-[#2d3748] flex justify-center">
                        <a 
                            href={`https://nzrglc.csb.app/?hash=${round.hash}`} // Tvoj verifikator link
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-xs font-bold text-[#4299e1] hover:text-[#63b3ed] transition uppercase tracking-wider"
                        >
                            Provability fair check <FaExternalLinkAlt />
                        </a>
                    </div>

                </div>
            </motion.div>
        </div>
    );
};