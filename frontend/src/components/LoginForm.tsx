import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FaUser, FaLock, FaGamepad, FaChevronRight } from 'react-icons/fa';
import { loginUser } from '../api';
import { socket } from '../socket';

export const LoginForm: React.FC = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await new Promise(r => setTimeout(r, 600)); 
            
            const data = await loginUser(username, password);
            localStorage.setItem('crash_token', data.token);
            localStorage.setItem('crash_username', data.user.username);
            
            socket.auth = { token: data.token };
            socket.connect();
            window.location.reload();
        } catch (err: any) {
            setError(err.message || 'Greška pri povezivanju.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0b0e11] flex items-center justify-center p-4 relative overflow-hidden font-rajdhani selection:bg-[#ff6b00] selection:text-white">
            
            <div className="absolute inset-0 z-0">
                <div className="absolute inset-0 opacity-[0.03]" 
                     style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '50px 50px' }}>
                </div>
                
                <motion.div 
                    animate={{ x: [0, 100, 0], y: [0, -100, 0], scale: [1, 1.2, 1] }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                    className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-[#ff6b00] rounded-full blur-[180px] opacity-10"
                />
                <motion.div 
                    animate={{ x: [0, -150, 0], y: [0, 100, 0], scale: [1, 1.5, 1] }}
                    transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                    className="absolute bottom-1/3 right-1/4 w-[600px] h-[600px] bg-purple-600 rounded-full blur-[200px] opacity-10"
                />
            </div>

            <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.6, type: "spring" }}
                className="w-full max-w-[420px] relative z-10"
            >
                <div className="bg-[#151921]/80 backdrop-blur-2xl border border-white/5 shadow-2xl rounded-3xl p-8 md:p-10 relative overflow-hidden group">
                    
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#ff6b00] to-transparent opacity-50 group-hover:opacity-100 transition-opacity duration-500"></div>

                    <div className="text-center mb-10 relative">
                        <motion.div 
                            initial={{ rotate: -180, scale: 0 }}
                            animate={{ rotate: 0, scale: 1 }}
                            transition={{ delay: 0.2, type: "spring" }}
                            className="w-20 h-20 mx-auto bg-gradient-to-br from-[#242830] to-[#151921] rounded-2xl flex items-center justify-center mb-4 shadow-lg border border-white/5"
                        >
                            <FaGamepad className="text-4xl text-[#ff6b00] drop-shadow-[0_0_15px_rgba(255,107,0,0.5)]" />
                        </motion.div>
                        <h1 className="text-3xl font-black text-white tracking-wider">
                            CRASH<span className="text-[#ff6b00]">GO</span>
                        </h1>
                        <p className="text-gray-500 text-xs font-bold tracking-[0.2em] uppercase mt-1">Next Gen Gambling</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-5">
                        <div className="space-y-2">
                            <label className="text-[11px] font-black text-gray-400 uppercase tracking-wider ml-1">username</label>
                            <div className="relative group/input">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within/input:text-[#ff6b00] transition-colors">
                                    <FaUser />
                                </div>
                                <input 
                                    type="text" 
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="w-full bg-[#0b0e11] border border-[#2d323b] focus:border-[#ff6b00] rounded-xl py-4 pl-12 pr-4 text-white font-bold placeholder-gray-600 outline-none transition-all duration-300 focus:shadow-[0_0_20px_rgba(255,107,0,0.1)]"
                                    placeholder="Unesite vaš ID"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[11px] font-black text-gray-400 uppercase tracking-wider ml-1">Password</label>
                            <div className="relative group/input">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within/input:text-[#ff6b00] transition-colors">
                                    <FaLock />
                                </div>
                                <input 
                                    type="password" 
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-[#0b0e11] border border-[#2d323b] focus:border-[#ff6b00] rounded-xl py-4 pl-12 pr-4 text-white font-bold placeholder-gray-600 outline-none transition-all duration-300 focus:shadow-[0_0_20px_rgba(255,107,0,0.1)]"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        {error && (
                            <motion.div 
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg text-xs font-bold text-center flex items-center justify-center gap-2"
                            >
                                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                                {error}
                            </motion.div>
                        )}

                        <motion.button 
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            disabled={loading}
                            type="submit" 
                            className={`w-full h-14 rounded-xl font-black text-sm uppercase tracking-widest relative overflow-hidden group/btn transition-all
                                ${loading ? 'bg-[#242830] cursor-not-allowed' : 'bg-[#ff6b00] hover:shadow-[0_0_30px_rgba(255,107,0,0.4)] text-white'}
                            `}
                        >
                            <div className="absolute top-0 -left-full w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-[-30deg] group-hover/btn:animate-[shine_1s_infinite]" />
                            
                            <span className="relative z-10 flex items-center justify-center gap-2">
                                {loading ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        <span>Loading...</span>
                                    </>
                                ) : (
                                    <>
                                        ULOGUJ SE <FaChevronRight className="text-xs" />
                                    </>
                                )}
                            </span>
                        </motion.button>
                    </form>
                </div>

                <div className="mt-8 flex justify-center gap-6 text-xs font-bold text-gray-600 uppercase tracking-widest">
                    <a href="#" className="hover:text-[#ff6b00] transition-colors">Rules</a>
                    <span className="text-gray-700">•</span>
                    <a href="#" className="hover:text-[#ff6b00] transition-colors">Support</a>
                </div>
            </motion.div>
        </div>
    );
};