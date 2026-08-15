import React, { useState, useEffect } from 'react';
import { Play, X, Swords, Layers, Settings, Trash2, Map, ChevronLeft, ChevronRight } from 'lucide-react';
import type { LevelConfig } from '../types/game';
import { CAMPAIGN_LEVELS, generateRandomLevel } from '../utils/levels';
import { GAME_VERSION, GAME_NAME } from '../utils/version';
import { getUnlockedLevel, getCustomMaps, deleteCustomMap, type CustomMap } from '../utils/storage';
import { FACTIONS } from '../utils/levels';

interface LevelSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectLevel: (level: LevelConfig) => void;
  currentLevelId: string;
  isGameActive?: boolean;
  onOpenMapEditor?: () => void;
}

export const LevelSelectModal: React.FC<LevelSelectModalProps> = ({
  isOpen,
  onClose,
  onSelectLevel,
  currentLevelId,
  isGameActive,
  onOpenMapEditor,
}) => {
  const [tab, setTab] = useState<'campaign' | 'skirmish' | 'custom'>('campaign');
  const [skirmishFactions, setSkirmishFactions] = useState<number>(3);
  const [skirmishPlanets, setSkirmishPlanets] = useState<number>(10);
  
  // Local storage state
  const unlockedLevel = getUnlockedLevel();
  const [customMaps, setCustomMaps] = useState<CustomMap[]>(getCustomMaps());
  
  const [campaignIndex, setCampaignIndex] = useState(0);

  useEffect(() => {
    if (isOpen) {
      const idx = CAMPAIGN_LEVELS.findIndex(l => l.id === currentLevelId);
      setCampaignIndex(Math.max(0, idx));
    }
  }, [isOpen, currentLevelId]);

  if (!isOpen) return null;

  const handleLaunchSkirmish = () => {
    const customLevel = generateRandomLevel(skirmishFactions, skirmishPlanets);
    onSelectLevel(customLevel);
    onClose();
  };

  const diffColors: Record<string, string> = {
    Easy: 'text-green-400 bg-green-500/10',
    Medium: 'text-yellow-400 bg-yellow-500/10',
    Hard: 'text-orange-400 bg-orange-500/10',
    Insane: 'text-red-400 bg-red-500/10',
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      {/* Centered Minimalist Floating Header */}
      <div className="flex flex-col items-center justify-center relative mb-8 w-full max-w-4xl">
        {/* Close button absolutely positioned on the right */}
        {isGameActive && (
          <button
            onClick={onClose}
            className="absolute top-0 right-0 p-3 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-all cursor-pointer border border-white/5"
            title="Resume Game"
          >
            <X className="w-6 h-6" />
          </button>
        )}

        <img src="/favicon.svg" alt="Logo" className="w-28 h-28 mb-4 drop-shadow-[0_0_15px_rgba(255,255,255,0.4)]" />
        <h2 className="text-4xl font-black text-white font-orbitron tracking-[0.2em] uppercase mb-1 drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
          {GAME_NAME}
        </h2>
        <span className="text-xs text-white/50 font-mono tracking-widest">v{GAME_VERSION}</span>
      </div>

      <div className="w-full max-w-4xl glass-panel rounded-2xl p-6 flex flex-col max-h-[70vh]">

        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setTab('campaign')}
            className={`flex-1 py-3 rounded-lg text-sm font-bold uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center gap-2 border ${
              tab === 'campaign' 
                ? 'glass-panel-glow-white text-white border-white/50 shadow-[0_0_20px_rgba(255,255,255,0.2)]' 
                : 'bg-black/20 text-white/40 hover:bg-white/5 hover:text-white/80 border-white/5'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span className="hidden sm:inline">Campaign</span>
          </button>
          <button
            onClick={() => setTab('skirmish')}
            className={`flex-1 py-3 rounded-lg text-sm font-bold uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center gap-2 border ${
              tab === 'skirmish' 
                ? 'glass-panel-glow-white text-white border-white/50 shadow-[0_0_20px_rgba(255,255,255,0.2)]' 
                : 'bg-black/20 text-white/40 hover:bg-white/5 hover:text-white/80 border-white/5'
            }`}
          >
            <Swords className="w-4 h-4" />
            <span className="hidden sm:inline">Skirmish</span>
          </button>
          <button
            onClick={() => setTab('custom')}
            className={`flex-1 py-3 rounded-lg text-sm font-bold uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center gap-2 border ${
              tab === 'custom' 
                ? 'glass-panel-glow-white text-white border-white/50 shadow-[0_0_20px_rgba(255,255,255,0.2)]' 
                : 'bg-black/20 text-white/40 hover:bg-white/5 hover:text-white/80 border-white/5'
            }`}
          >
            <Map className="w-4 h-4" />
            <span className="hidden sm:inline">Custom Maps</span>
          </button>
        </div>

        {tab === 'campaign' ? (
          <div className="flex flex-col items-center flex-1 w-full pb-4 px-2">
            
            {/* The Main Viewport for Slider */}
            <div className="relative w-full max-w-3xl flex-1 flex items-center justify-center">

              {/* Center Content */}
              {(() => {
                const level = CAMPAIGN_LEVELS[campaignIndex];
                const isCurrent = level.id === currentLevelId;
                const isLocked = (campaignIndex + 1) > unlockedLevel;

                // Generate constellation lines
                const lines: {x1:number, y1:number, x2:number, y2:number}[] = [];
                level.planets.forEach((p, i) => {
                  let nearest: {x: number, y: number} | null = null;
                  let minD = Infinity;
                  for (let j = 0; j < level.planets.length; j++) {
                    if (i === j) continue;
                    const p2 = level.planets[j];
                    const d = Math.hypot(p.x - p2.x, p.y - p2.y);
                    if (d < minD) { minD = d; nearest = p2; }
                  }
                  if (nearest) {
                    lines.push({ x1: p.x, y1: p.y, x2: nearest.x, y2: nearest.y });
                  }
                });

                return (
                  <div className={`w-full max-w-2xl h-full flex flex-col items-center transition-all duration-500 ${isLocked ? 'opacity-50 grayscale' : 'opacity-100'}`}>
                    
                    {/* SVG Minimap Box */}
                    <div className="w-full h-64 mb-6 rounded-xl border border-white/10 bg-black/40 overflow-hidden relative shadow-[inset_0_0_50px_rgba(0,0,0,0.8)] group">
                      
                      {/* Left Arrow */}
                      <button 
                        onClick={() => setCampaignIndex(prev => (prev > 0 ? prev - 1 : CAMPAIGN_LEVELS.length - 1))}
                        className="absolute left-4 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-black/40 hover:bg-white/10 text-white/50 hover:text-white transition-all cursor-pointer backdrop-blur-sm border border-white/10 opacity-0 group-hover:opacity-100 sm:opacity-100"
                      >
                        <ChevronLeft className="w-6 h-6" />
                      </button>

                      {/* Right Arrow */}
                      <button 
                        onClick={() => setCampaignIndex(prev => (prev < CAMPAIGN_LEVELS.length - 1 ? prev + 1 : 0))}
                        className="absolute right-4 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-black/40 hover:bg-white/10 text-white/50 hover:text-white transition-all cursor-pointer backdrop-blur-sm border border-white/10 opacity-0 group-hover:opacity-100 sm:opacity-100"
                      >
                        <ChevronRight className="w-6 h-6" />
                      </button>

                      <svg 
                        viewBox={`0 0 ${level.width} ${level.height}`} 
                        className="absolute inset-0 w-full h-full drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]"
                        preserveAspectRatio="xMidYMid meet"
                      >
                        {/* Lines */}
                        {lines.map((line, idx) => (
                          <line 
                            key={`line-${idx}`} 
                            x1={line.x1} y1={line.y1} 
                            x2={line.x2} y2={line.y2} 
                            stroke="rgba(255,255,255,0.15)" 
                            strokeWidth="2" 
                            strokeDasharray="10 10" 
                          />
                        ))}
                        {/* Planets */}
                        {level.planets.map((p, idx) => (
                          <g key={`planet-${idx}`}>
                            <circle 
                              cx={p.x} cy={p.y} 
                              r={p.radius} 
                              fill={FACTIONS[p.owner].color} 
                              opacity="0.8"
                            />
                            {p.type === 'portal' && (
                              <circle cx={p.x} cy={p.y} r={p.radius + 15} stroke="#88ddff" strokeWidth="4" fill="none" strokeDasharray="5 5" />
                            )}
                            {p.type === 'turret' && (
                              <circle cx={p.x} cy={p.y} r={p.radius + 10} stroke="#ff5555" strokeWidth="4" fill="none" />
                            )}
                            {p.type === 'mothership' && (
                              <circle cx={p.x} cy={p.y} r={p.radius + 20} stroke="#ffaa00" strokeWidth="6" fill="none" />
                            )}
                          </g>
                        ))}
                      </svg>
                      {isLocked && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                           <span className="font-orbitron text-2xl tracking-[0.5em] text-white/50">RESTRICTED</span>
                        </div>
                      )}
                    </div>

                    {/* Level Info */}
                    <div className="text-center px-8 w-full">
                      <div className="flex items-center justify-center gap-3 mb-2">
                        <h3 className={`text-2xl font-bold font-orbitron tracking-widest uppercase ${isCurrent ? 'text-white glow-white' : 'text-white/90'}`}>
                          {String(campaignIndex + 1).padStart(2, '0')}. {level.name}
                        </h3>
                        <span className={`text-[10px] px-2 py-0.5 rounded-sm uppercase tracking-widest border border-white/10 ${diffColors[level.difficulty]}`}>
                          {level.difficulty}
                        </span>
                      </div>
                      <p className="text-sm text-white/50 mb-6 leading-relaxed max-w-xl mx-auto h-10">
                        {level.description}
                      </p>

                      <button
                        disabled={isLocked}
                        onClick={() => {
                          if (!isLocked) {
                            onSelectLevel(level);
                            onClose();
                          }
                        }}
                        className={`w-full max-w-md mx-auto py-3.5 rounded-lg text-sm font-bold uppercase tracking-widest flex items-center justify-center gap-3 transition-all ${
                          isLocked 
                            ? 'bg-white/5 text-white/20 cursor-not-allowed border border-white/5'
                            : isCurrent
                              ? 'bg-white text-black hover:bg-gray-200 shadow-[0_0_20px_rgba(255,255,255,0.5)] cursor-pointer'
                              : 'bg-white/10 text-white/90 hover:bg-white/20 hover:text-white hover:border-white/30 border border-white/10 cursor-pointer shadow-[0_0_15px_rgba(255,255,255,0.1)]'
                        }`}
                      >
                        <Play className="w-4 h-4 fill-current" />
                        <span>{isLocked ? 'MISSION LOCKED' : isCurrent ? 'RESUME MISSION' : 'ENGAGE FLEET'}</span>
                      </button>
                    </div>

                  </div>
                );
              })()}



            </div>

            {/* Pagination Dots */}
            <div className="flex gap-1.5 mt-6">
              {CAMPAIGN_LEVELS.map((_, i) => (
                <button
                  key={`dot-${i}`}
                  onClick={() => setCampaignIndex(i)}
                  className={`h-1.5 rounded-full transition-all cursor-pointer ${
                    i === campaignIndex 
                      ? 'w-6 bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.8)]' 
                      : i < unlockedLevel ? 'w-1.5 bg-white/40 hover:bg-white/60' : 'w-1.5 bg-white/10 hover:bg-white/20'
                  }`}
                />
              ))}
            </div>

          </div>
        ) : tab === 'skirmish' ? (
          <div className="flex flex-col gap-6 p-6 glass-panel rounded-xl flex-1 justify-between">
            <div className="space-y-8">
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-white/50 block mb-3">
                  ENEMY FACTIONS: <span className="text-white ml-1 glow-white">{skirmishFactions}</span>
                </label>
                <div className="flex gap-3">
                  {[2, 3, 4, 5].map(num => (
                    <button
                      key={num}
                      onClick={() => setSkirmishFactions(num)}
                      className={`flex-1 py-3 rounded-lg text-base font-orbitron font-bold transition-all cursor-pointer ${
                        skirmishFactions === num
                          ? 'glass-panel-glow-white text-white'
                          : 'bg-white/5 border border-white/5 text-white/40 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-white/50 block mb-4">
                  TOTAL PLANETS: <span className="text-white ml-1 glow-white">{skirmishPlanets}</span>
                </label>
                <input
                  type="range"
                  min={6}
                  max={16}
                  value={skirmishPlanets}
                  onChange={e => setSkirmishPlanets(parseInt(e.target.value))}
                  className="w-full accent-white cursor-pointer h-2 bg-white/10 rounded-full appearance-none"
                />
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={handleLaunchSkirmish}
                className="flex-1 py-4 rounded-lg bg-white/5 hover:bg-white/10 text-white font-bold uppercase tracking-widest transition-all border border-white/10 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Swords className="w-5 h-5" />
                <span>QUICK MATCH</span>
              </button>
              <button
                onClick={() => {
                  onSelectLevel(CAMPAIGN_LEVELS[0]); // dummy, will be intercepted
                  onOpenMapEditor?.();
                }}
                className="flex-1 py-4 rounded-lg bg-white hover:bg-gray-200 text-black font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_20px_rgba(255,255,255,0.4)]"
              >
                <Settings className="w-5 h-5" />
                <span>MAP EDITOR</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4 p-6 glass-panel rounded-xl flex-1 overflow-y-auto">
             {customMaps.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-white/40 py-12 gap-4">
                  <Map className="w-12 h-12 opacity-50" />
                  <p>No custom maps found.</p>
                  <button
                    onClick={() => {
                      onSelectLevel(CAMPAIGN_LEVELS[0]);
                      onOpenMapEditor?.();
                    }}
                    className="px-6 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-bold uppercase tracking-widest mt-4"
                  >
                    Create One
                  </button>
                </div>
             ) : (
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {customMaps.map(m => (
                    <div key={m.id} className="p-4 rounded-xl glass-panel border border-white/10 flex flex-col gap-4">
                      <div className="flex justify-between items-start">
                        <span className="font-orbitron font-bold text-white text-lg">{m.name}</span>
                        <span className="text-[10px] text-white/50 tracking-widest uppercase">{m.planets.length} Planets</span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            onSelectLevel({
                              id: m.id,
                              name: m.name,
                              description: 'Custom User Map',
                              difficulty: 'Custom',
                              width: 1200, height: 800,
                              planets: m.planets,
                              activeFactions: Array.from(new Set(m.planets.map(p => p.owner)))
                            });
                            onClose();
                          }}
                          className="flex-1 py-2 rounded bg-white text-black text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-gray-200"
                        >
                          <Play className="w-4 h-4 fill-current" /> Play
                        </button>
                        <button
                          onClick={() => {
                            deleteCustomMap(m.id);
                            setCustomMaps(getCustomMaps());
                          }}
                          className="px-4 py-2 rounded bg-red-500/20 text-red-500 hover:bg-red-500 hover:text-white transition-colors flex items-center justify-center"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
               </div>
             )}
          </div>
        )}
        <div className="mt-4 text-center text-white/50 text-[9px] font-orbitron tracking-widest uppercase px-4 leading-tight">
          This is a free, open-source homage to classic RTS mechanics.<br/>
          Not affiliated with or endorsed by any original rights holders.
        </div>
        <div className="mt-2 text-center text-white/30 text-[10px] font-orbitron tracking-widest uppercase pointer-events-auto">
          Made with 🗿 by <a href="https://serverket.dev" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Serverket</a>
        </div>
      </div>
    </div>
  );
};
