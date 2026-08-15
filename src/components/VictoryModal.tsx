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
    <div className="fixed inset-0 z-50 flex flex-col p-2 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto no-scrollbar">
      <div className="w-full max-w-md mx-auto glass-panel rounded-2xl p-4 sm:p-8 flex flex-col items-center text-center shrink-0 my-auto sm:my-0">
        <div className={`w-12 h-12 sm:w-20 sm:h-20 shrink-0 rounded-full flex items-center justify-center mb-2 sm:mb-6 shadow-lg ${
          isVictory ? 'bg-white/20 text-white shadow-[0_0_20px_rgba(255,255,255,0.3)] border border-white/30' : 'bg-red-500/20 text-red-400 shadow-[0_0_20px_rgba(255,51,102,0.3)] border border-red-500/30'
        }`}>
          {isVictory ? <Trophy className="w-6 h-6 sm:w-10 sm:h-10" /> : <Skull className="w-6 h-6 sm:w-10 sm:h-10" />}
        </div>

        <h2 className={`text-xl sm:text-3xl font-black font-orbitron tracking-widest uppercase mb-1 sm:mb-2 shrink-0 ${isVictory ? 'text-white glow-white' : 'text-red-400 glow-red'}`}>
          {isVictory ? 'VICTORY' : 'DEFEAT'}
        </h2>
        <p className="text-xs sm:text-sm text-white/50 mb-4 sm:mb-8 font-medium shrink-0">
          {isVictory ? 'All enemy planets have been assimilated.' : 'Your fleet has been eradicated.'}
        </p>

        <div className="w-full flex flex-row sm:grid sm:grid-cols-2 gap-1 sm:gap-3 mb-2 sm:mb-8 text-xs font-orbitron shrink-0 overflow-x-auto no-scrollbar">
          <div className="flex-1 bg-white/5 rounded-md sm:rounded-lg p-1.5 sm:p-4 border border-white/5 flex flex-col justify-center">
            <div className="text-white/40 text-[8px] sm:text-[10px] tracking-widest uppercase">SHIPS BUILT</div>
            <div className="text-xs sm:text-xl font-bold text-white sm:mt-1 glow-white">{stats.shipsProduced}</div>
          </div>
          <div className="flex-1 bg-white/5 rounded-md sm:rounded-lg p-1.5 sm:p-4 border border-white/5 flex flex-col justify-center">
            <div className="text-white/40 text-[8px] sm:text-[10px] tracking-widest uppercase">DESTROYED</div>
            <div className="text-xs sm:text-xl font-bold text-gray-300 sm:mt-1 glow-gray">{stats.shipsDestroyed}</div>
          </div>
          <div className="flex-1 bg-white/5 rounded-md sm:rounded-lg p-1.5 sm:p-4 border border-white/5 flex flex-col justify-center">
            <div className="text-white/40 text-[8px] sm:text-[10px] tracking-widest uppercase">CAPTURED</div>
            <div className="text-xs sm:text-xl font-bold text-white sm:mt-1">{stats.planetsCaptured}</div>
          </div>
          <div className="flex-1 bg-white/5 rounded-md sm:rounded-lg p-1.5 sm:p-4 border border-white/5 flex flex-col justify-center">
            <div className="text-white/40 text-[8px] sm:text-[10px] tracking-widest uppercase">COMBAT TIME</div>
            <div className="text-xs sm:text-xl font-bold text-white sm:mt-1 glow-white">{durationSec}s</div>
          </div>
        </div>

        <div className="w-full flex flex-row sm:flex-col gap-1 sm:gap-3 text-[10px] sm:text-sm font-bold uppercase tracking-widest shrink-0">
          {isVictory && (
            <button
              onClick={onNextLevel}
              className="flex-1 py-2 sm:py-4 rounded-lg bg-white hover:bg-gray-200 text-black transition-all flex items-center justify-center gap-1 sm:gap-2 cursor-pointer shadow-[0_0_20px_rgba(255,255,255,0.4)]"
            >
              <span className="hidden sm:inline">PROCEED</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          )}

          <button
            onClick={onRestart}
            className={`${isVictory ? 'flex-1 sm:w-full' : 'w-full'} py-2 sm:py-3.5 rounded-lg glass-panel hover:bg-white/10 text-white/80 transition-all flex items-center justify-center gap-1 sm:gap-2 cursor-pointer`}
          >
            <RotateCcw className="w-4 h-4" />
            <span className="hidden sm:inline">REINITIALIZE</span>
          </button>

          <button
            onClick={onLevelSelect}
            className={`${isVictory ? 'flex-1 sm:w-full' : 'w-full'} py-2 sm:py-3.5 rounded-lg bg-transparent border border-white/10 hover:bg-white/5 text-white/50 hover:text-white transition-all flex items-center justify-center gap-1 sm:gap-2 cursor-pointer`}
          >
            <Grid className="w-4 h-4" />
            <span className="hidden sm:inline">COMMAND CENTER</span>
          </button>
        </div>
      </div>
    </div>
  );
};
