import React, { useRef } from 'react';
import { Play, Pause, Volume2, VolumeX, Grid, RotateCcw } from 'lucide-react';
import type { Planet, Ship, FactionId } from '../types/game';
import { FACTIONS } from '../utils/levels';

interface HUDProps {
  levelName: string;
  planets: Planet[];
  ships: Ship[];
  sendPercentage: number;
  onSetSendPercentage: (ratio: number) => void;
  speedMultiplier: number;
  onSetSpeedMultiplier: (speed: number) => void;
  isPaused: boolean;
  onTogglePause: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  onSelectAllPlayerPlanets: () => void;
  onRestartLevel: () => void;
  onOpenLevelSelect: () => void;
  settingsMenu?: React.ReactNode;
}

export const HUD: React.FC<HUDProps> = ({
  levelName,
  planets,
  ships,
  sendPercentage,
  onSetSendPercentage,
  speedMultiplier,
  onSetSpeedMultiplier,
  isPaused,
  onTogglePause,
  isMuted,
  onToggleMute,
  onSelectAllPlayerPlanets,
  onRestartLevel,
  onOpenLevelSelect,
  settingsMenu,
}) => {
  const factionCounts: Record<FactionId, { planets: number; ships: number }> = {
    player: { planets: 0, ships: 0 },
    ai1: { planets: 0, ships: 0 },
    ai2: { planets: 0, ships: 0 },
    ai3: { planets: 0, ships: 0 },
    ai4: { planets: 0, ships: 0 },
    neutral: { planets: 0, ships: 0 },
  };

  planets.forEach(p => {
    factionCounts[p.owner].planets += 1;
    factionCounts[p.owner].ships += Math.floor(p.ships);
  });

  ships.forEach(s => {
    factionCounts[s.faction].ships += 1;
  });

  const totalShips = Object.values(factionCounts).reduce((acc, v) => acc + v.ships, 0) || 1;
  const activeFactions = (Object.keys(factionCounts) as FactionId[]).filter(f => f !== 'neutral' && (factionCounts[f].planets > 0 || factionCounts[f].ships > 0));

  // Compute dominating faction with Hysteresis
  const lastDominantRef = useRef<string>('neutral');
  let currentDominant = 'neutral';
  
  if (planets.length > 0) {
    let first = 0;
    let second = 0;
    let firstFaction = 'neutral';
    
    for (const [fac, data] of Object.entries(factionCounts)) {
      if (fac === 'neutral') continue;
      const count = data.planets;
      if (count > first) {
        second = first;
        first = count;
        firstFaction = fac;
      } else if (count > second) {
        second = count;
      }
    }
    
    if (first > second) {
      currentDominant = firstFaction;
    } else if (first === second && first > 0) {
       if (factionCounts[lastDominantRef.current as FactionId]?.planets === first) {
         currentDominant = lastDominantRef.current;
       } else {
         currentDominant = 'neutral';
       }
    }
  }
  lastDominantRef.current = currentDominant;

  const dominantColor = currentDominant !== 'neutral' ? FACTIONS[currentDominant as FactionId].color : 'transparent';
  
  const topPanelStyle = {
    borderBottomColor: dominantColor,
    borderBottomWidth: currentDominant !== 'neutral' ? '2px' : '1px',
    boxShadow: currentDominant !== 'neutral' ? `0 15px 25px -15px ${dominantColor}60` : undefined,
    transition: 'border-bottom-color 1.5s ease, box-shadow 1.5s ease, border-width 0.3s ease'
  };

  const bottomPanelStyle = {
    borderTopColor: dominantColor,
    borderTopWidth: currentDominant !== 'neutral' ? '2px' : '1px',
    boxShadow: currentDominant !== 'neutral' ? `0 -15px 25px -15px ${dominantColor}60` : undefined,
    transition: 'border-top-color 1.5s ease, box-shadow 1.5s ease, border-width 0.3s ease'
  };

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-1 sm:p-3 pt-[max(env(safe-area-inset-top),0.25rem)] pb-[max(env(safe-area-inset-bottom),0.25rem)] px-[max(env(safe-area-inset-left),0.25rem)] z-10 select-none">
      {/* Top bar */}
      <div 
        className="flex justify-between items-center glass-panel rounded-lg px-2 sm:px-4 py-1 sm:py-2 pointer-events-auto max-w-5xl mx-auto w-full flex-nowrap gap-1 sm:gap-2"
        style={topPanelStyle}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenLevelSelect}
            className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Grid className="w-3.5 h-3.5 glow-cyan" />
            <span className="font-orbitron tracking-wider hidden sm:inline">Levels</span>
          </button>
          <div className="text-xs sm:text-sm font-bold text-white font-orbitron tracking-widest glow-cyan truncate max-w-[100px] sm:max-w-none">{levelName}</div>
        </div>

        {/* Faction strength bar */}
        <div className="flex-1 max-w-sm mx-2 sm:mx-4 flex flex-col gap-0.5 sm:gap-1">
          <div className="flex justify-between text-[10px] text-white/60">
            {activeFactions.map(f => (
              <span key={f} style={{ color: FACTIONS[f].color }}>
                {factionCounts[f].ships}
              </span>
            ))}
          </div>
          <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden flex">
            {activeFactions.map(f => {
              const pct = (factionCounts[f].ships / totalShips) * 100;
              if (pct <= 0) return null;
              return (
                <div
                  key={f}
                  style={{ width: `${pct}%`, backgroundColor: FACTIONS[f].color }}
                  className="h-full transition-all duration-300"
                />
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {settingsMenu}
          <button
            onClick={onRestartLevel}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/70 transition-all cursor-pointer"
            title="Restart"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onToggleMute}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/70 transition-all cursor-pointer"
            title="Mute All"
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Bottom bar - percentage slider + speed controls */}
      <div 
        className="flex flex-nowrap justify-between items-center glass-panel rounded-lg px-2 sm:px-4 py-1.5 sm:py-2.5 pointer-events-auto max-w-3xl mx-auto w-full gap-2 sm:gap-4 overflow-x-auto no-scrollbar"
        style={bottomPanelStyle}
      >
        {/* Send percentage slider */}
        <div className="flex items-center gap-2 flex-1 min-w-[150px] max-w-xs">
          <span className="text-[10px] text-white/50 whitespace-nowrap hidden sm:inline">Send</span>
          <input
            type="range"
            min={0}
            max={100}
            step={10}
            value={Math.round(sendPercentage * 100)}
            onChange={e => onSetSendPercentage(parseInt(e.target.value) / 100)}
            className="flex-1 accent-blue-400 cursor-pointer"
          />
          <span className="text-xs text-white font-medium w-8 text-right">{Math.round(sendPercentage * 100)}%</span>
        </div>

        {/* Select all */}
        <button
          onClick={onSelectAllPlayerPlanets}
          className="px-3 py-1 rounded-md bg-white/10 hover:bg-white/20 text-white/80 text-xs font-medium transition-all cursor-pointer whitespace-nowrap"
        >
          All
        </button>

        {/* Speed controls */}
        <div className="flex items-center gap-0.5 sm:gap-1 bg-white/5 p-1 rounded-lg justify-center flex-nowrap shrink-0">
          <button
            onClick={onTogglePause}
            className={`p-1.5 rounded-md transition-all cursor-pointer ${
              isPaused ? 'bg-amber-500 text-black' : 'text-white/60 hover:text-white'
            }`}
            title="Pause"
          >
            {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
          </button>
          {[0.2, 0.5, 1, 2].map(spd => (
            <button
              key={spd}
              onClick={() => {
                if (isPaused) onTogglePause();
                onSetSpeedMultiplier(spd);
              }}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                !isPaused && speedMultiplier === spd
                  ? 'bg-blue-500 text-white'
                  : 'text-white/50 hover:text-white'
              }`}
            >
              {spd}x
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
