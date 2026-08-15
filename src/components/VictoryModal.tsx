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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="w-full max-w-md glass-panel rounded-2xl p-8 flex flex-col items-center text-center">
        <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 shadow-lg ${
          isVictory ? 'bg-white/20 text-white shadow-[0_0_20px_rgba(255,255,255,0.3)] border border-white/30' : 'bg-red-500/20 text-red-400 shadow-[0_0_20px_rgba(255,51,102,0.3)] border border-red-500/30'
        }`}>
          {isVictory ? <Trophy className="w-10 h-10" /> : <Skull className="w-10 h-10" />}
        </div>

        <h2 className={`text-3xl font-black font-orbitron tracking-widest uppercase mb-2 ${isVictory ? 'text-white glow-white' : 'text-red-400 glow-red'}`}>
          {isVictory ? 'VICTORY' : 'DEFEAT'}
        </h2>
        <p className="text-sm text-white/50 mb-8 font-medium">
          {isVictory ? 'All enemy planets have been assimilated.' : 'Your fleet has been eradicated.'}
        </p>

        <div className="w-full grid grid-cols-2 gap-3 mb-8 text-xs font-orbitron">
          <div className="bg-white/5 rounded-lg p-4 border border-white/5">
            <div className="text-white/40 text-[10px] tracking-widest uppercase">SHIPS BUILT</div>
            <div className="text-xl font-bold text-white mt-1 glow-white">{stats.shipsProduced}</div>
          </div>
          <div className="bg-white/5 rounded-lg p-4 border border-white/5">
            <div className="text-white/40 text-[10px] tracking-widest uppercase">DESTROYED</div>
            <div className="text-xl font-bold text-gray-300 mt-1 glow-gray">{stats.shipsDestroyed}</div>
          </div>
          <div className="bg-white/5 rounded-lg p-4 border border-white/5">
            <div className="text-white/40 text-[10px] tracking-widest uppercase">CAPTURED</div>
            <div className="text-xl font-bold text-white mt-1">{stats.planetsCaptured}</div>
          </div>
          <div className="bg-white/5 rounded-lg p-4 border border-white/5">
            <div className="text-white/40 text-[10px] tracking-widest uppercase">COMBAT TIME</div>
            <div className="text-xl font-bold text-white mt-1 glow-white">{durationSec}s</div>
          </div>
        </div>

        <div className="w-full flex flex-col gap-3 text-sm font-bold uppercase tracking-widest">
          {isVictory && (
            <button
              onClick={onNextLevel}
              className="w-full py-4 rounded-lg bg-white hover:bg-gray-200 text-black transition-all flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_20px_rgba(255,255,255,0.4)]"
            >
              <span>PROCEED</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          )}

          <button
            onClick={onRestart}
            className="w-full py-3.5 rounded-lg glass-panel hover:bg-white/10 text-white/80 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>REINITIALIZE</span>
          </button>

          <button
            onClick={onLevelSelect}
            className="w-full py-3.5 rounded-lg bg-transparent border border-white/10 hover:bg-white/5 text-white/50 hover:text-white transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Grid className="w-4 h-4" />
            <span>COMMAND CENTER</span>
          </button>
        </div>
      </div>
    </div>
  );
};
