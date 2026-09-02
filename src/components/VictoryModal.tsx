import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Trophy, Skull, RotateCcw, ArrowRight, Grid } from 'lucide-react';
import type { GameStats } from '../types/game';

interface VictoryModalProps {
  isVictory: boolean;
  stats: GameStats;
  onNextLevel: () => void;
  onRestart: () => void;
  onLevelSelect: () => void;
}

export const VictoryModal: React.FC<VictoryModalProps> = ({
  isVictory,
  stats,
  onNextLevel,
  onRestart,
  onLevelSelect,
}) => {
  useEffect(() => {
    if (isVictory) {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#4488ff', '#ffffff', '#88ccff']
      });
    }
  }, [isVictory]);

  const durationSec = Math.round((Date.now() - stats.startTime) / 1000) || 1;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center p-2 sm:p-4 pb-[calc(env(safe-area-inset-bottom,0px)+0.5rem)] bg-black/80 backdrop-blur-md overflow-hidden touch-none">
      <div className="w-full max-w-md mx-auto glass-panel rounded-2xl p-4 sm:p-8 [@media(max-height:500px)]:p-3 flex flex-col items-center text-center max-h-full min-h-0">
        <div className={`w-12 h-12 sm:w-20 sm:h-20 [@media(max-height:500px)]:w-8 [@media(max-height:500px)]:h-8 shrink-0 rounded-full flex items-center justify-center mb-2 sm:mb-6 [@media(max-height:500px)]:mb-1 shadow-lg ${
          isVictory ? 'bg-white/20 text-white shadow-[0_0_20px_rgba(255,255,255,0.3)] border border-white/30' : 'bg-red-500/20 text-red-400 shadow-[0_0_20px_rgba(255,51,102,0.3)] border border-red-500/30'
        }`}>
          {isVictory ? <Trophy className="w-6 h-6 sm:w-10 sm:h-10 [@media(max-height:500px)]:w-4 [@media(max-height:500px)]:h-4" /> : <Skull className="w-6 h-6 sm:w-10 sm:h-10 [@media(max-height:500px)]:w-4 [@media(max-height:500px)]:h-4" />}
        </div>

        <h2 className={`text-xl sm:text-3xl [@media(max-height:500px)]:text-lg font-black font-orbitron tracking-widest uppercase mb-1 sm:mb-2 [@media(max-height:500px)]:mb-0.5 shrink-0 min-h-0 ${isVictory ? 'text-white glow-white' : 'text-red-400 glow-red'}`}>
          {isVictory ? 'VICTORY' : 'DEFEAT'}
        </h2>
        <p className="text-[10px] sm:text-sm [@media(max-height:500px)]:text-[9px] text-white/50 mb-2 sm:mb-8 [@media(max-height:500px)]:mb-1.5 font-medium shrink-0 min-h-0 truncate">
          {isVictory ? 'All enemy planets have been assimilated.' : 'Your fleet has been eradicated.'}
        </p>

        <div className="w-full flex flex-row sm:grid sm:grid-cols-2 [@media(max-height:500px)]:flex [@media(max-height:500px)]:flex-row gap-1 sm:gap-3 [@media(max-height:500px)]:gap-1 mb-2 sm:mb-8 [@media(max-height:500px)]:mb-2 text-xs font-orbitron flex-1 min-h-0 overflow-hidden">
          <div className="flex-1 bg-white/5 rounded-md sm:rounded-lg p-1.5 sm:p-4 [@media(max-height:500px)]:p-1 flex flex-col justify-center">
            <div className="text-white/40 text-[8px] sm:text-[10px] [@media(max-height:500px)]:text-[7px] tracking-widest uppercase truncate">SHIPS BUILT</div>
            <div className="text-xs sm:text-xl [@media(max-height:500px)]:text-xs font-bold text-white sm:mt-1 glow-white">{stats.shipsProduced}</div>
          </div>
          <div className="flex-1 bg-white/5 rounded-md sm:rounded-lg p-1.5 sm:p-4 [@media(max-height:500px)]:p-1 flex flex-col justify-center">
            <div className="text-white/40 text-[8px] sm:text-[10px] [@media(max-height:500px)]:text-[7px] tracking-widest uppercase truncate">DESTROYED</div>
            <div className="text-xs sm:text-xl [@media(max-height:500px)]:text-xs font-bold text-gray-300 sm:mt-1 glow-gray">{stats.shipsDestroyed}</div>
          </div>
          <div className="flex-1 bg-white/5 rounded-md sm:rounded-lg p-1.5 sm:p-4 [@media(max-height:500px)]:p-1 flex flex-col justify-center">
            <div className="text-white/40 text-[8px] sm:text-[10px] [@media(max-height:500px)]:text-[7px] tracking-widest uppercase truncate">CAPTURED</div>
            <div className="text-xs sm:text-xl [@media(max-height:500px)]:text-xs font-bold text-white sm:mt-1">{stats.planetsCaptured}</div>
          </div>
          <div className="flex-1 bg-white/5 rounded-md sm:rounded-lg p-1.5 sm:p-4 [@media(max-height:500px)]:p-1 flex flex-col justify-center">
            <div className="text-white/40 text-[8px] sm:text-[10px] [@media(max-height:500px)]:text-[7px] tracking-widest uppercase truncate">COMBAT TIME</div>
            <div className="text-xs sm:text-xl [@media(max-height:500px)]:text-xs font-bold text-white sm:mt-1 glow-white">{durationSec}s</div>
          </div>
        </div>

        <div className="w-full flex flex-row sm:flex-col [@media(max-height:500px)]:flex-row gap-1 sm:gap-3 [@media(max-height:500px)]:gap-1 text-[10px] sm:text-sm [@media(max-height:500px)]:text-[9px] font-bold uppercase tracking-widest shrink-0 min-h-0">
          {isVictory && (
            <button
              onClick={onNextLevel}
              className="flex-1 py-2 sm:py-4 [@media(max-height:500px)]:py-1.5 rounded-lg bg-white hover:bg-gray-200 text-black transition-all flex items-center justify-center gap-1 sm:gap-2 cursor-pointer shadow-[0_0_20px_rgba(255,255,255,0.4)]"
            >
              <span className="hidden sm:inline [@media(max-height:500px)]:hidden">PROCEED</span>
              <span className="sm:hidden [@media(max-height:500px)]:inline">PROCEED</span>
              <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 [@media(max-height:500px)]:hidden" />
            </button>
          )}

          <button
            onClick={onRestart}
            className={`${isVictory ? 'flex-1 sm:w-full [@media(max-height:500px)]:w-auto' : 'w-full'} py-2 sm:py-3.5 [@media(max-height:500px)]:py-1.5 rounded-lg glass-panel hover:bg-white/10 text-white/80 transition-all flex items-center justify-center gap-1 sm:gap-2 cursor-pointer`}
          >
            <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4 [@media(max-height:500px)]:w-3 [@media(max-height:500px)]:h-3" />
            <span className="hidden sm:inline [@media(max-height:500px)]:hidden">REINITIALIZE</span>
            <span className="sm:hidden [@media(max-height:500px)]:inline">RESTART</span>
          </button>

          <button
            onClick={onLevelSelect}
            className={`${isVictory ? 'flex-1 sm:w-full [@media(max-height:500px)]:w-auto' : 'w-full'} py-2 sm:py-3.5 [@media(max-height:500px)]:py-1.5 rounded-lg bg-transparent border border-white/10 hover:bg-white/5 text-white/50 hover:text-white transition-all flex items-center justify-center gap-1 sm:gap-2 cursor-pointer`}
          >
            <Grid className="w-3.5 h-3.5 sm:w-4 sm:h-4 [@media(max-height:500px)]:w-3 [@media(max-height:500px)]:h-3" />
            <span className="hidden sm:inline [@media(max-height:500px)]:hidden">COMMAND CENTER</span>
            <span className="sm:hidden [@media(max-height:500px)]:inline">MENU</span>
          </button>
        </div>
      </div>
    </div>
  );
};
