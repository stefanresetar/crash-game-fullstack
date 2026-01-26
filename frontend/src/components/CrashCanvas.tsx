import React, { useRef, useEffect } from 'react';
import { useGameStore } from '../store/gameStore';

const rocketImg = new Image(); rocketImg.src = '/assets/img/rocket.png';
const meteorImg = new Image(); meteorImg.src = '/assets/img/meteor.png';

export const CrashCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const statusRef = useRef(useGameStore.getState().status);
  const multRef = useRef(useGameStore.getState().currentMultiplier);

  useEffect(() => useGameStore.subscribe((state) => {
    statusRef.current = state.status;
    multRef.current = state.currentMultiplier;
  }), []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    let animationFrameId: number;
    let particles: any[] = [];
    let stars: any[] = [];

    const initStars = (w: number, h: number) => {
      stars = [];
      for(let i=0; i<80; i++) {
        stars.push({ x: Math.random() * w, y: Math.random() * h, size: Math.random() * 2, speed: Math.random() * 2 + 0.5 });
      }
    };

    const resize = () => {
      if (containerRef.current && canvas) {
        canvas.width = containerRef.current.offsetWidth;
        canvas.height = containerRef.current.offsetHeight;
        initStars(canvas.width, canvas.height);
      }
    };
    
    window.addEventListener('resize', resize);
    resize();

    const render = () => {
      const w = canvas.width;
      const h = canvas.height;
      const status = statusRef.current;
      const val = multRef.current;

      ctx.clearRect(0, 0, w, h);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      stars.forEach(s => { 
          ctx.beginPath(); ctx.arc(s.x, s.y, s.size, 0, Math.PI*2); ctx.fill(); 
          if(status === 'running') {
              s.x -= s.speed; s.y += s.speed * 0.5;
              if(s.x < 0) s.x = w; if(s.y > h) s.y = 0;
          }
      });

      if (status === 'running' || status === 'crashed') {
        let zoom = val > 2 ? val : 2;
        let normY = (val - 1) / (zoom - 1 + 2); 
        if(normY > 0.85) normY = 0.85;
        
        let endX = 40 + (w * 0.8) * normY; 
        let endY = h - 40 - (h * 0.8) * normY; 

        ctx.beginPath();
        ctx.moveTo(40, h - 40);
        ctx.quadraticCurveTo(w * 0.2, h - 40, endX, endY);
        ctx.lineWidth = 4;
        ctx.strokeStyle = status === 'crashed' ? '#e53e3e' : '#4299e1';
        ctx.stroke();

        if(status === 'running') {
            for(let i=0; i<3; i++) {
                particles.push({
                    x: endX - 25 + Math.random() * 6, y: endY + 25 + Math.random() * 6,  
                    vx: (Math.random() - 0.5), vy: 5 + Math.random() * 3, life: 1.0, color: `rgba(66, 153, 225,`
                });
            }
        }

        for (let i = particles.length - 1; i >= 0; i--) {
            let p = particles[i];
            let pX = p.x + p.vx;
            let pY = p.y + p.vy;
            let pLife = p.life - 0.04;
            p.x = pX; p.y = pY; p.life = pLife;

            if(pLife <= 0) {
                particles.splice(i, 1);
            } else {
                ctx.fillStyle = p.color + pLife + ')';
                ctx.beginPath(); ctx.arc(pX, pY, (3 * pLife), 0, Math.PI*2); ctx.fill();
            }
        }

        if(status !== 'crashed') {
            ctx.save(); ctx.translate(endX, endY);
            ctx.drawImage(rocketImg, -25, -25, 50, 50); 
            ctx.restore();
        } else {
            ctx.drawImage(meteorImg, endX - 30, endY - 30, 60, 60);
            ctx.beginPath(); ctx.arc(endX, endY, 40, 0, Math.PI*2); 
            ctx.fillStyle = `rgba(229, 62, 62, 0.4)`; ctx.fill();
        }
      } 
      
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div ref={containerRef} className="w-full h-full relative overflow-hidden bg-radial-dark rounded-lg">
      <canvas ref={canvasRef} className="block w-full h-full" />
      
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none z-10 w-full">
        <StatusOverlay />
      </div>
    </div>
  );
};

const StatusOverlay = () => {
    const { status, currentMultiplier, timeLeft, setTimeLeft } = useGameStore();

    useEffect(() => {
        let interval: any;
        
        if (status === 'waiting' && timeLeft > 0) {
            interval = setInterval(() => {
                const currentTime = useGameStore.getState().timeLeft;
                const newTime = Math.max(0, currentTime - 0.1);
                setTimeLeft(newTime);
            }, 100);
        }

        return () => clearInterval(interval);
    }, [status]);
    // ----------------------------------------------

    if (status === 'waiting') {
        const percentage = Math.min(100, Math.max(0, (timeLeft / 10) * 100));

        return (
            <div className="flex flex-col items-center justify-center">
                <div className="text-xl font-bold text-gray-400 tracking-[3px] uppercase mb-1">STARTING IN</div>
                <div className="text-[70px] font-bold text-white leading-none mb-4 font-mono">
                    {timeLeft.toFixed(1)}s
                </div>
                
                <div className="w-64 h-2 bg-gray-700/50 rounded-full overflow-hidden backdrop-blur-sm">
                    <div 
                        className="h-full bg-gradient-to-r from-orange-600 to-orange-400 shadow-[0_0_10px_rgba(255,107,0,0.5)] transition-all duration-100 ease-linear"
                        style={{ width: `${percentage}%` }}
                    />
                </div>
            </div>
        );
    }

    if (status === 'crashed') {
        return (
            <div>
                <div className="text-2xl font-bold text-gray-500 tracking-[4px] uppercase mb-2">CRASHED</div>
                <div className="text-[90px] font-extrabold text-[#e53e3e] drop-shadow-[0_0_50px_rgba(229,62,62,0.6)]">
                    {currentMultiplier.toFixed(2)}x
                </div>
            </div>
        );
    }

    if (status === 'running') {
        let color = '#4299e1';
        if (currentMultiplier >= 10) color = '#9f7aea';
        if (currentMultiplier >= 50) color = '#b794f4';

        return (
            <div>
                <div className="text-2xl font-bold text-gray-500 tracking-[4px] uppercase mb-2">WAITING...</div>
                <div className="text-[110px] font-extrabold drop-shadow-[0_0_50px_rgba(255,255,255,0.15)] transition-all duration-200 tabular-nums" style={{ color }}>
                    {currentMultiplier.toFixed(2)}x
                </div>
            </div>
        );
    }

    return <div className="text-white animate-pulse font-bold tracking-widest">UČITAVANJE...</div>;
};