import React, { useState, useEffect, useRef } from 'react';
import GameCanvas from './components/GameCanvas';
import VirtualJoystick from './components/VirtualJoystick';
import MissionCommand from './components/MissionCommand';
import { GameStatus, Vector2 } from './types';
import { COLORS } from './constants';

const App: React.FC = () => {
  const [status, setStatus] = useState<GameStatus>(GameStatus.MENU);
  const [score, setScore] = useState(0);
  const [wave, setWave] = useState(1);
  const [credits, setCredits] = useState(0);
  
  // Upgrades
  const [fireRateLevel, setFireRateLevel] = useState(0);
  const [healthLevel, setHealthLevel] = useState(0);
  
  // Inputs
  const [joystickVec, setJoystickVec] = useState<Vector2>({ x: 0, y: 0 });
  const [isFiring, setIsFiring] = useState(false);
  const [smartBombTrigger, setSmartBombTrigger] = useState(0);
  const [sbCooldown, setSbCooldown] = useState(0); // Cooldown remaining in ms
  const SB_COOLDOWN_MAX = 8000;
  
  // Radar Canvas Reference
  const radarCanvasRef = useRef<HTMLCanvasElement>(null);

  // Keyboard input for desktop debugging
  useEffect(() => {
    const keys = { w: false, a: false, s: false, d: false, ' ': false };
    
    const handleKey = (e: KeyboardEvent, isDown: boolean) => {
        if (e.key.toLowerCase() in keys) {
            keys[e.key.toLowerCase() as keyof typeof keys] = isDown;
            
            // Calc vector
            let x = 0, y = 0;
            if (keys.a) x -= 1;
            if (keys.d) x += 1;
            if (keys.w) y -= 1;
            if (keys.s) y += 1;
            
            // Normalize
            if (x !== 0 || y !== 0) {
                const len = Math.sqrt(x*x + y*y);
                x /= len;
                y /= len;
            }
            setJoystickVec({ x, y });
            
            if (e.key === ' ') setIsFiring(isDown);
        }
        // 'F' key for Smart Bomb
        if (e.key.toLowerCase() === 'f' && isDown) {
             triggerSmartBomb();
        }
    };

    const down = (e: KeyboardEvent) => handleKey(e, true);
    const up = (e: KeyboardEvent) => handleKey(e, false);

    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
        window.removeEventListener('keydown', down);
        window.removeEventListener('keyup', up);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cooldown Timer
  useEffect(() => {
      let interval: ReturnType<typeof setInterval>;
      if (sbCooldown > 0) {
          interval = setInterval(() => {
              setSbCooldown(prev => Math.max(0, prev - 100));
          }, 100);
      }
      return () => clearInterval(interval);
  }, [sbCooldown]);

  const triggerSmartBomb = () => {
      if (sbCooldown > 0) return;
      setSmartBombTrigger(prev => prev + 1);
      setSbCooldown(SB_COOLDOWN_MAX);
  };

  const handleGameOver = () => {
    setStatus(GameStatus.GAME_OVER);
    setCredits(prev => prev + Math.floor(score / 10));
    setSbCooldown(0); // Reset cooldown on death
  };

  const buyFireRateUpgrade = () => {
      if (credits >= 500 && fireRateLevel < 3) {
          setCredits(prev => prev - 500);
          setFireRateLevel(prev => prev + 1);
      }
  };

  const buyHealthUpgrade = () => {
      if (credits >= 500 && healthLevel < 3) {
          setCredits(prev => prev - 500);
          setHealthLevel(prev => prev + 1);
      }
  };

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden select-none">
      
      {/* Game Layer */}
      <div className="absolute inset-0 z-0">
        <GameCanvas 
          status={status}
          joystickInput={joystickVec}
          isFiring={isFiring}
          smartBombTrigger={smartBombTrigger}
          onScoreUpdate={setScore}
          onWaveUpdate={setWave}
          onGameOver={handleGameOver}
          fireRateLevel={fireRateLevel}
          healthLevel={healthLevel}
          radarCanvasRef={radarCanvasRef}
        />
      </div>

      {/* UI Overlay */}
      <div className="absolute inset-0 z-10 pointer-events-none flex flex-col justify-between p-4 md:p-8">
        
        {/* Top HUD */}
        <div className="flex justify-between items-start">
            {/* Score/Wave */}
            <div className="bg-slate-900/80 border border-cyan-500/30 p-4 rounded-br-2xl backdrop-blur-sm transform skew-x-[-10deg]">
                <div className="transform skew-x-[10deg]">
                    <h1 className="font-display text-2xl md:text-4xl text-cyan-400 font-bold tracking-wider drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]">
                        NEON SIEGE
                    </h1>
                    <div className="flex space-x-6 mt-1 text-sm md:text-base font-mono">
                        <div className="text-cyan-200">WAVE: <span className="text-white text-lg">{wave}</span></div>
                        <div className="text-purple-200">SCORE: <span className="text-white text-lg">{score.toLocaleString()}</span></div>
                        <div className="text-yellow-200">CREDITS: <span className="text-white text-lg">{credits}</span></div>
                    </div>
                </div>
            </div>

            {/* Radar System */}
            <div className="w-32 h-32 md:w-48 md:h-48 border-2 border-cyan-500/50 rounded-full bg-slate-900/50 relative hidden md:block backdrop-blur overflow-hidden shadow-[0_0_15px_rgba(8,145,178,0.3)]">
                <canvas 
                    ref={radarCanvasRef} 
                    width={200} 
                    height={200} 
                    className="w-full h-full opacity-90"
                />
                <div className="absolute inset-0 rounded-full border border-cyan-500/20 pointer-events-none"></div>
                {/* Scanner Line Animation */}
                <div className="absolute inset-0 w-full h-full rounded-full animate-[spin_4s_linear_infinite] pointer-events-none origin-center">
                    <div className="w-1/2 h-full absolute right-0 bg-gradient-to-l from-cyan-500/10 to-transparent" style={{ clipPath: 'polygon(0 50%, 100% 0, 100% 50%)' }}></div>
                </div>
                <div className="absolute bottom-2 right-4 text-[10px] text-cyan-400 font-mono opacity-80">RADAR ACTIVE</div>
            </div>
        </div>

        {/* Start Menu */}
        {status === GameStatus.MENU && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm pointer-events-auto z-50">
                <div className="text-center space-y-8">
                    <h1 className="font-display text-6xl md:text-8xl text-transparent bg-clip-text bg-gradient-to-b from-cyan-300 to-purple-600 font-black tracking-tighter drop-shadow-2xl">
                        PROTOCOL:<br/>SIEGE
                    </h1>
                    <button 
                        onClick={() => setStatus(GameStatus.PLAYING)}
                        className="group relative px-12 py-4 bg-cyan-600 hover:bg-cyan-500 text-white font-display font-bold text-xl tracking-widest clip-path-polygon transition-all hover:scale-105 shadow-[0_0_20px_rgba(8,145,178,0.6)]"
                    >
                        <span className="relative z-10">INITIALIZE COMBAT</span>
                        <div className="absolute inset-0 bg-white/20 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></div>
                    </button>
                    <div className="text-gray-400 font-mono text-sm animate-pulse">
                        SYSTEM READY. AWAITING INPUT.
                    </div>
                </div>
            </div>
        )}

        {/* Game Over Screen */}
        {status === GameStatus.GAME_OVER && (
            <div className="absolute inset-0 flex items-center justify-center bg-red-900/40 backdrop-blur-md pointer-events-auto z-50">
                <div className="bg-slate-900 border-2 border-red-500 p-8 max-w-md w-full text-center shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-red-500 animate-pulse"></div>
                    <h2 className="font-display text-4xl text-red-500 mb-2">CRITICAL FAILURE</h2>
                    <p className="font-mono text-gray-300 mb-6">UNIT DESTROYED</p>
                    
                    <div className="grid grid-cols-2 gap-4 mb-8 text-left bg-black/30 p-4 rounded">
                        <div className="text-gray-400">FINAL SCORE</div>
                        <div className="text-right text-xl text-white">{score}</div>
                        <div className="text-gray-400">CREDITS EARNED</div>
                        <div className="text-right text-xl text-yellow-400">+{Math.floor(score/10)}</div>
                    </div>

                    <div className="flex flex-col space-y-3">
                        <button 
                            onClick={() => {
                                setScore(0);
                                setWave(1);
                                setStatus(GameStatus.PLAYING);
                            }}
                            className="w-full py-3 bg-red-600 hover:bg-red-500 text-white font-bold tracking-wider"
                        >
                            REDEPLOY
                        </button>
                        <button 
                             onClick={() => setStatus(GameStatus.SHOP)}
                             className="w-full py-3 border border-yellow-500 text-yellow-500 hover:bg-yellow-500/10 font-bold tracking-wider"
                        >
                            ARMORY
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* Shop Screen */}
        {status === GameStatus.SHOP && (
             <div className="absolute inset-0 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm z-50 pointer-events-auto">
                 <div className="max-w-4xl w-full p-8 relative bg-slate-900/90 border border-cyan-800 shadow-2xl rounded-lg">
                     <div className="flex justify-between items-center mb-8 border-b border-cyan-800 pb-4">
                        <h2 className="font-display text-4xl text-cyan-400">ARMORY</h2>
                        <div className="text-right">
                            <div className="text-sm text-gray-400">AVAILABLE CREDITS</div>
                            <div className="text-3xl text-yellow-400 font-mono">{credits}</div>
                        </div>
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                         
                         {/* Fire Rate Upgrade */}
                         <div className="bg-slate-800/90 border border-slate-600 p-6 flex flex-col items-center text-center hover:border-cyan-500 transition-colors shadow-lg group">
                             <div className="w-16 h-16 bg-cyan-900 rounded-full mb-4 flex items-center justify-center text-2xl shadow-[0_0_15px_rgba(8,145,178,0.5)] group-hover:scale-110 transition-transform">⚡</div>
                             <h3 className="text-xl font-bold text-white mb-2">OVERCLOCK CORE</h3>
                             <p className="text-gray-400 text-sm mb-4">Increases Fire Rate.</p>
                             <div className="mt-auto w-full">
                                 <div className="text-xs text-cyan-300 mb-2">LEVEL {fireRateLevel}/3</div>
                                 <button 
                                    onClick={buyFireRateUpgrade}
                                    disabled={credits < 500 || fireRateLevel >= 3}
                                    className="px-6 py-2 bg-yellow-600 hover:bg-yellow-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-bold rounded w-full transition-all"
                                 >
                                     {fireRateLevel >= 3 ? 'MAXED' : '500 CR'}
                                 </button>
                             </div>
                         </div>

                         {/* Health Upgrade */}
                         <div className="bg-slate-800/90 border border-slate-600 p-6 flex flex-col items-center text-center hover:border-green-500 transition-colors shadow-lg group">
                             <div className="w-16 h-16 bg-green-900 rounded-full mb-4 flex items-center justify-center text-2xl shadow-[0_0_15px_rgba(34,197,94,0.5)] group-hover:scale-110 transition-transform">🛡️</div>
                             <h3 className="text-xl font-bold text-white mb-2">REACTIVE PLATING</h3>
                             <p className="text-gray-400 text-sm mb-4">Increases Max HP and Armor.</p>
                             <div className="mt-auto w-full">
                                <div className="text-xs text-green-300 mb-2">LEVEL {healthLevel}/3</div>
                                <button 
                                    onClick={buyHealthUpgrade}
                                    disabled={credits < 500 || healthLevel >= 3}
                                    className="px-6 py-2 bg-yellow-600 hover:bg-yellow-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-bold rounded w-full transition-all"
                                >
                                    {healthLevel >= 3 ? 'MAXED' : '500 CR'}
                                </button>
                             </div>
                         </div>

                         {/* Locked Item */}
                         <div className="bg-slate-800/50 border border-slate-600 p-6 flex flex-col items-center text-center opacity-50">
                             <div className="w-16 h-16 bg-red-900 rounded-full mb-4 flex items-center justify-center text-2xl">💥</div>
                             <h3 className="text-xl font-bold text-white mb-2">PLASMA PAYLOAD</h3>
                             <p className="text-gray-400 text-sm mb-4">Increases Blast Radius. (Out of Stock)</p>
                             <div className="mt-auto w-full">
                                 <button disabled className="px-6 py-2 bg-gray-700 text-gray-400 font-bold rounded w-full">LOCKED</button>
                             </div>
                         </div>
                     </div>

                     <button 
                        onClick={() => setStatus(GameStatus.MENU)}
                        className="mt-12 text-gray-400 hover:text-white flex items-center mx-auto transition-colors"
                     >
                         <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7 7-7-7" />
                         </svg>
                         RETURN TO MAIN MENU
                     </button>
                 </div>
             </div>
        )}

        {/* Controls Overlay (Only visible in play) */}
        {status === GameStatus.PLAYING && (
            <div className="pointer-events-auto w-full flex justify-between items-end pb-8">
                {/* Joystick Area */}
                <div className="pl-4 md:pl-12">
                    <VirtualJoystick onMove={setJoystickVec} size={140} />
                </div>

                {/* Action Buttons */}
                <div className="pr-4 md:pr-12 flex items-end space-x-6">
                    <MissionCommand gameStatus={status} score={score} wave={wave} />
                    
                    {/* Smart Bomb Button */}
                    <div className="relative">
                        <button
                            className={`w-16 h-16 rounded-full border-2 flex items-center justify-center transition-all shadow-lg ${sbCooldown > 0 ? 'bg-gray-800 border-gray-600 opacity-50' : 'bg-yellow-600/80 border-yellow-400 hover:scale-105 shadow-yellow-500/30'}`}
                            onClick={triggerSmartBomb}
                            onTouchStart={(e) => { e.preventDefault(); triggerSmartBomb(); }}
                            disabled={sbCooldown > 0}
                        >
                            <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                            </svg>
                        </button>
                        {/* Cooldown Overlay */}
                        {sbCooldown > 0 && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <span className="text-xs font-bold text-white">{(sbCooldown/1000).toFixed(1)}</span>
                                <svg className="absolute inset-0 w-full h-full -rotate-90">
                                    <circle
                                        cx="32" cy="32" r="28"
                                        stroke="currentColor" strokeWidth="4"
                                        fill="none"
                                        className="text-gray-700"
                                    />
                                    <circle
                                        cx="32" cy="32" r="28"
                                        stroke="currentColor" strokeWidth="4"
                                        fill="none"
                                        className="text-yellow-500"
                                        strokeDasharray={175}
                                        strokeDashoffset={175 * (sbCooldown / SB_COOLDOWN_MAX)}
                                    />
                                </svg>
                            </div>
                        )}
                        <div className="text-center mt-1 text-[10px] text-yellow-400 font-bold tracking-wider">SMART BOMB</div>
                    </div>

                    {/* Fire Button */}
                    <button 
                        className={`w-24 h-24 rounded-full border-4 ${isFiring ? 'bg-red-500/80 border-red-300 scale-95' : 'bg-red-900/50 border-red-500'} backdrop-blur-sm flex items-center justify-center shadow-[0_0_30px_rgba(239,68,68,0.4)] transition-all active:scale-95`}
                        onMouseDown={() => setIsFiring(true)}
                        onMouseUp={() => setIsFiring(false)}
                        onTouchStart={(e) => { e.preventDefault(); setIsFiring(true); }}
                        onTouchEnd={(e) => { e.preventDefault(); setIsFiring(false); }}
                    >
                        <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9v-2h2v2zm0-4H9V8h2v4zm6 2h-2v-2h2v2zm0-4h-2V8h2v4z"/>
                        </svg>
                    </button>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default App;