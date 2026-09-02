import React, { useState, useEffect } from 'react';
import { Play, X, Swords, Layers, Settings, Trash2, Map, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import type { LevelConfig } from '../types/game';
import { CAMPAIGN_LEVELS, MOTHERSHIP_LEVELS, generateRandomLevel } from '../utils/levels';
import { GAME_VERSION, GAME_NAME } from '../utils/version';
import { getUnlockedLevel, getCustomMaps, deleteCustomMap, getMothershipUnlocked, type CustomMap } from '../utils/storage';
import { FACTIONS } from '../utils/levels';
import { BlackholeBackground } from './BlackholeBackground';

interface LevelSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectLevel: (level: LevelConfig) => void;
  currentLevelId: string;
  isGameActive?: boolean;
  onOpenMapEditor?: (map?: CustomMap) => void;
  settingsMenu?: React.ReactNode;
}

export const LevelSelectModal: React.FC<LevelSelectModalProps> = ({
  isOpen,
  onClose,
  onSelectLevel,
  currentLevelId,
  isGameActive,
  onOpenMapEditor,
  settingsMenu,
}) => {
  const [tab, setTab] = useState<'campaign' | 'skirmish' | 'custom'>('campaign');
  const [activeSector, setActiveSector] = useState<'origin' | 'mothership'>('origin');
  const [skirmishFactions, setSkirmishFactions] = useState<number>(3);
  const [skirmishPlanets, setSkirmishPlanets] = useState<number>(10);
  
  // Local storage state
  const unlockedLevel = getUnlockedLevel();
  const isMothershipUnlocked = getMothershipUnlocked();
  const [customMaps, setCustomMaps] = useState<CustomMap[]>(getCustomMaps());
  
  const [campaignIndex, setCampaignIndex] = useState(0);

  useEffect(() => {
    if (isOpen) {
      if (currentLevelId.startsWith('m_lvl')) {
        setActiveSector('mothership');
        const idx = MOTHERSHIP_LEVELS.findIndex(l => l.id === currentLevelId);
        setCampaignIndex(Math.max(0, idx));
      } else {
        setActiveSector('origin');
        const idx = CAMPAIGN_LEVELS.findIndex(l => l.id === currentLevelId);
        setCampaignIndex(Math.max(0, idx));
      }
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
    LATAM: 'text-white bg-[linear-gradient(110deg,#FCD116_0%,#FCD116_33.333%,#003893_33.333%,#003893_66.666%,#CE1126_66.666%,#CE1126_100%)] border-none shadow-[0_0_15px_rgba(252,209,22,0.4)] font-bold',
  };

  const isDarkSector = activeSector === 'mothership' && tab === 'campaign';
  const themeGlow = isDarkSector ? 'shadow-[0_0_20px_rgba(200,0,255,0.2)] border-[rgba(200,0,255,0.4)] text-[rgba(255,100,255,1)]' : 'shadow-[0_0_20px_rgba(255,255,255,0.2)] glass-panel-glow-white text-white border-white/50';

  return (
    <div className={`fixed inset-0 z-50 flex p-2 sm:p-4 overflow-hidden touch-none transition-colors duration-1000 ${isDarkSector ? 'bg-[#1a001a]/40' : 'bg-black/20'}`}>
      <BlackholeBackground />
      
      {/* Settings are now embedded in the tabs row to prevent overlap */}

      <div className="flex flex-row [@media(min-width:768px)_and_(min-height:550px)]:flex-col w-full h-full max-w-6xl [@media(min-width:768px)_and_(min-height:550px)]:max-w-4xl mx-auto gap-3 sm:gap-6 relative pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]">
        
        {/* Left Panel (Mobile) / Top Panel (Desktop): Branding */}
        <div className="w-[35%] [@media(min-width:768px)_and_(min-height:550px)]:w-full flex flex-col items-center justify-center shrink-0 [@media(min-width:768px)_and_(min-height:550px)]:mt-auto [@media(min-width:768px)_and_(min-height:550px)]:mb-4">
          <img src="/favicon.svg" alt="Logo" className={`w-16 h-16 sm:w-20 sm:h-20 [@media(min-width:768px)_and_(min-height:550px)]:w-28 [@media(min-width:768px)_and_(min-height:550px)]:h-28 mb-3 sm:mb-4 transition-all duration-1000 ${isDarkSector ? 'drop-shadow-[0_0_25px_rgba(200,0,255,0.8)] hue-rotate-90' : 'drop-shadow-[0_0_15px_rgba(255,255,255,0.4)]'}`} />
          <h2 className={`text-lg sm:text-2xl [@media(min-width:768px)_and_(min-height:550px)]:text-4xl font-black font-orbitron tracking-[0.2em] uppercase text-center mb-1 transition-colors duration-1000 ${isDarkSector ? 'text-[#ff55ff] drop-shadow-[0_0_15px_rgba(255,0,255,0.6)]' : 'text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]'}`}>
            {GAME_NAME}
          </h2>
          <span className="text-[9px] sm:text-xs text-white/50 font-mono tracking-widest text-center block mb-3 sm:mb-4">v{GAME_VERSION}</span>
          
          {/* Controls Panel (Settings, Profile, Close Game) */}
          <div className="flex items-center gap-2 mb-4 sm:mb-6">
            {settingsMenu}
            {isGameActive && (
              <button
                onClick={onClose}
                className="p-2 rounded-lg bg-black/40 hover:bg-white/20 text-white/70 hover:text-white transition-all cursor-pointer backdrop-blur-md border border-white/10 shadow-lg flex items-center justify-center"
                title="Resume Game"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          <div className="[@media(min-width:768px)_and_(min-height:550px)]:hidden text-center text-white/40 text-[7px] sm:text-[9px] font-orbitron tracking-widest uppercase leading-tight">
            This is a free homage to classic RTS mechanics.<br/>
            Not affiliated with original rights holders.
          </div>
          <div className="mt-1 sm:mt-2 [@media(min-width:768px)_and_(min-height:550px)]:hidden text-center text-white/30 text-[7px] sm:text-[9px] font-orbitron tracking-widest uppercase">
            Made with 🗿 by <a href="https://serverket.dev" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Serverket</a>
          </div>
        </div>

        {/* Right Panel (Mobile) / Bottom Panel (Desktop): Content */}
        <div className={`w-[65%] [@media(min-width:768px)_and_(min-height:550px)]:w-full glass-panel rounded-2xl p-3 sm:p-5 [@media(min-width:768px)_and_(min-height:550px)]:p-6 flex flex-col flex-1 min-h-0 relative transition-all duration-1000 ${isDarkSector ? 'bg-[rgba(20,0,20,0.8)] border-[rgba(200,0,255,0.2)] shadow-[0_0_40px_rgba(150,0,200,0.3)]' : ''}`}>
          
          {/* Tabs */}
          <div className="flex justify-between items-start mb-2 sm:mb-4 shrink-0">
            <div className="flex gap-2 sm:gap-4 flex-1">
            <button
              onClick={() => setTab('campaign')}
              className={`flex-1 py-1.5 sm:py-2.5 rounded-md text-[9px] sm:text-xs font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-1 sm:gap-2 border whitespace-nowrap min-w-0 px-1 ${
                tab === 'campaign' 
                  ? themeGlow
                  : 'bg-black/20 text-white/40 hover:bg-white/5 hover:text-white/80 border-white/5'
              }`}
            >
              <Layers className="w-3 h-3 sm:w-4 sm:h-4 shrink-0" />
              <span className="hidden sm:inline">Campaign</span>
            </button>
            <button
              onClick={() => setTab('skirmish')}
              className={`flex-1 py-1.5 sm:py-2.5 rounded-md text-[9px] sm:text-xs font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-1 sm:gap-2 border whitespace-nowrap min-w-0 px-1 ${
                tab === 'skirmish' 
                  ? 'glass-panel-glow-white text-white border-white/50 shadow-[0_0_20px_rgba(255,255,255,0.2)]' 
                  : 'bg-black/20 text-white/40 hover:bg-white/5 hover:text-white/80 border-white/5'
              }`}
            >
              <Swords className="w-3 h-3 sm:w-4 sm:h-4 shrink-0" />
              <span className="hidden sm:inline">Skirmish</span>
            </button>
            <button
              onClick={() => setTab('custom')}
              className={`flex-1 py-1.5 sm:py-2.5 rounded-md text-[9px] sm:text-xs font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-1 sm:gap-2 border whitespace-nowrap min-w-0 px-1 ${
                tab === 'custom' 
                  ? 'glass-panel-glow-white text-white border-white/50 shadow-[0_0_20px_rgba(255,255,255,0.2)]' 
                  : 'bg-black/20 text-white/40 hover:bg-white/5 hover:text-white/80 border-white/5'
              }`}
            >
              <Map className="w-3 h-3 sm:w-4 sm:h-4 shrink-0" />
              <span className="hidden sm:inline">Custom Maps</span>
            </button>
            </div>
          </div>

          {/* Main Viewport */}
          <div className="flex-1 min-h-0 flex flex-col items-center w-full relative">
            
            {tab === 'campaign' && (() => {
              const currentLevelArray = activeSector === 'origin' ? CAMPAIGN_LEVELS : MOTHERSHIP_LEVELS;
              const level = currentLevelArray[campaignIndex];
              const isCurrent = level.id === currentLevelId;
              const isLocked = activeSector === 'origin' ? (campaignIndex + 1) > unlockedLevel : false;

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
                <div className="w-full h-full flex flex-col justify-between shrink-0 px-1 sm:px-2">
                  
                  {/* Sector Toggle Header */}
                  {isMothershipUnlocked && (
                    <div className="flex bg-black/40 border border-white/10 rounded-full p-1 mb-2 relative w-full mx-auto max-w-[200px] sm:max-w-xs shrink-0 shadow-[inset_0_0_10px_rgba(0,0,0,0.8)]">
                      <div 
                        className={`absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-full transition-all duration-500 ease-out ${
                          activeSector === 'origin' ? 'left-1 bg-cyan-500/20 shadow-[0_0_15px_rgba(0,240,255,0.4)]' : 'translate-x-full left-1 bg-purple-600/30 shadow-[0_0_20px_rgba(200,0,255,0.5)]'
                        }`}
                      />
                      <button
                        onClick={() => { setActiveSector('origin'); setCampaignIndex(0); }}
                        className={`flex-1 py-1 sm:py-1.5 text-[8px] sm:text-[10px] font-bold uppercase tracking-widest z-10 transition-colors ${activeSector === 'origin' ? 'text-white' : 'text-white/40'}`}
                      >
                        Origin System
                      </button>
                      <button
                        onClick={() => { setActiveSector('mothership'); setCampaignIndex(0); }}
                        className={`flex-1 py-1 sm:py-1.5 text-[8px] sm:text-[10px] font-bold uppercase tracking-widest z-10 transition-colors ${activeSector === 'mothership' ? 'text-[#ffddff]' : 'text-white/40'}`}
                      >
                        Mothership Sector
                      </button>
                    </div>
                  )}

                  {/* SVG Minimap Box */}
                  <div className={`w-full flex-1 min-h-0 mb-2 rounded-xl border border-white/10 bg-black/40 overflow-hidden relative shadow-[inset_0_0_50px_rgba(0,0,0,0.8)] group shrink-0 transition-all ${isLocked ? 'opacity-50 grayscale' : 'opacity-100'}`}>
                    <button 
                      onClick={() => setCampaignIndex(prev => (prev > 0 ? prev - 1 : currentLevelArray.length - 1))}
                      className="absolute left-2 top-1/2 -translate-y-1/2 z-20 p-1 sm:p-2 rounded-full bg-black/60 hover:bg-white/10 text-white/50 hover:text-white transition-all backdrop-blur-md border border-white/10"
                    >
                      <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                    <button 
                      onClick={() => setCampaignIndex(prev => (prev < currentLevelArray.length - 1 ? prev + 1 : 0))}
                      className="absolute right-2 top-1/2 -translate-y-1/2 z-20 p-1 sm:p-2 rounded-full bg-black/60 hover:bg-white/10 text-white/50 hover:text-white transition-all backdrop-blur-md border border-white/10"
                    >
                      <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>

                    <svg 
                      viewBox={`0 0 ${level.width} ${level.height}`} 
                      className={`absolute inset-0 w-full h-full p-2 drop-shadow-[0_0_10px_rgba(255,255,255,0.2)] transition-all duration-1000 ${isDarkSector ? 'hue-rotate-180 drop-shadow-[0_0_15px_rgba(200,0,255,0.4)]' : ''}`}
                      preserveAspectRatio="xMidYMid meet"
                    >
                      {lines.map((line, idx) => (
                        <line key={idx} x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2} stroke="rgba(255,255,255,0.15)" strokeWidth="2" strokeDasharray="10 10" />
                      ))}
                      {level.planets.map((p, idx) => (
                        <g key={idx}>
                          <circle cx={p.x} cy={p.y} r={p.radius} fill={FACTIONS[p.owner].color} opacity="0.8" />
                          {p.type === 'portal' && <circle cx={p.x} cy={p.y} r={p.radius + 15} stroke="#88ddff" strokeWidth="4" fill="none" strokeDasharray="5 5" />}
                          {p.type === 'turret' && <circle cx={p.x} cy={p.y} r={p.radius + 10} stroke="#ff5555" strokeWidth="4" fill="none" />}
                          {p.type === 'mothership' && <circle cx={p.x} cy={p.y} r={p.radius + 20} stroke="#ffaa00" strokeWidth="6" fill="none" />}
                        </g>
                      ))}
                    </svg>
                    {isLocked && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                         <span className="font-orbitron text-sm sm:text-xl tracking-[0.5em] text-white/50">RESTRICTED</span>
                      </div>
                    )}
                  </div>

                  {/* Level Info & Action */}
                  <div className="w-full shrink-0 flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0 pr-2">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <h3 className={`text-xs sm:text-lg font-bold font-orbitron tracking-widest uppercase truncate ${isCurrent ? 'text-white glow-white' : 'text-white/90'}`}>
                          {String(campaignIndex + 1).padStart(2, '0')}. {level.name}
                        </h3>
                        <span className={`text-[8px] sm:text-[9px] px-1 py-0.5 rounded-sm uppercase tracking-widest border border-white/10 shrink-0 ${diffColors[level.difficulty]}`}>
                          {level.difficulty}
                        </span>
                      </div>
                      <p className="text-[9px] sm:text-xs text-white/50 truncate max-w-sm">
                        {level.description}
                      </p>
                    </div>

                    <button
                      disabled={isLocked}
                      onClick={() => {
                        if (!isLocked) {
                          onSelectLevel(level);
                          onClose();
                        }
                      }}
                      className={`shrink-0 px-4 py-2 sm:py-3 rounded-lg text-[10px] sm:text-xs font-bold uppercase tracking-widest flex items-center gap-1.5 transition-all ${
                        isLocked 
                          ? 'bg-white/5 text-white/20 cursor-not-allowed border border-white/5'
                          : isCurrent
                            ? 'bg-white text-black hover:bg-gray-200 shadow-[0_0_15px_rgba(255,255,255,0.5)] cursor-pointer'
                            : 'bg-white/10 text-white/90 hover:bg-white/20 hover:text-white border border-white/10 cursor-pointer shadow-[0_0_10px_rgba(255,255,255,0.1)]'
                      }`}
                    >
                      <Play className="w-3 h-3 sm:w-4 sm:h-4 fill-current shrink-0" />
                      <span className="hidden sm:inline">{isLocked ? 'LOCKED' : isCurrent ? 'RESUME' : 'ENGAGE'}</span>
                    </button>
                  </div>
                  
                  {/* Pagination Dots */}
                  <div className="flex justify-center gap-1 mt-2 mb-1">
                    {(activeSector === 'origin' ? CAMPAIGN_LEVELS : MOTHERSHIP_LEVELS).map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setCampaignIndex(i)}
                        className={`h-1 rounded-full transition-all cursor-pointer ${
                          i === campaignIndex 
                            ? (isDarkSector ? 'w-4 bg-purple-400' : 'w-4 bg-cyan-400')
                            : (activeSector === 'origin' && i < unlockedLevel) || activeSector === 'mothership' ? 'w-1 bg-white/40' : 'w-1 bg-white/10'
                        }`}
                      />
                    ))}
                  </div>

                </div>
              );
            })()}

            {tab === 'skirmish' && (
              <div className="flex flex-col p-4 sm:p-8 w-full h-full items-center justify-center">
                <div className="flex flex-col gap-6 sm:gap-10 w-full max-w-sm sm:max-w-md mx-auto my-auto">
                  
                  {/* Form Controls */}
                  <div className="space-y-6 sm:space-y-8">
                    <div>
                      <label className="text-xs sm:text-sm font-bold uppercase tracking-widest text-white/50 block mb-3 sm:mb-4">
                        ENEMY FACTIONS: <span className="text-cyan-400 glow-cyan ml-2">{skirmishFactions}</span>
                      </label>
                      <div className="flex gap-2 sm:gap-4">
                        {[2, 3, 4, 5].map(num => (
                          <button
                            key={num}
                            onClick={() => setSkirmishFactions(num)}
                            className={`flex-1 py-2 sm:py-3 rounded-lg text-base sm:text-lg font-orbitron font-bold transition-all border ${
                              skirmishFactions === num
                                ? 'bg-cyan-500/20 border-cyan-400 shadow-[0_0_20px_rgba(0,240,255,0.2)] text-cyan-50'
                                : 'bg-white/5 border-white/5 text-white/40 hover:bg-white/10 hover:text-white/80'
                            }`}
                          >
                            {num}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-3 sm:mb-4">
                        <label className="text-xs sm:text-sm font-bold uppercase tracking-widest text-white/50">
                          TOTAL PLANETS
                        </label>
                        <span className="text-xs sm:text-sm font-bold text-cyan-400 glow-cyan">{skirmishPlanets}</span>
                      </div>
                      <input
                        type="range"
                        min={6} max={16}
                        value={skirmishPlanets}
                        onChange={e => setSkirmishPlanets(parseInt(e.target.value))}
                        className="w-full accent-cyan-400 cursor-pointer h-1.5 sm:h-2 bg-white/10 rounded-full appearance-none shadow-[0_0_10px_rgba(0,240,255,0.2)]"
                      />
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mt-2 sm:mt-4">
                    <button
                      onClick={handleLaunchSkirmish}
                      className="flex-1 py-3 sm:py-4 rounded-lg bg-cyan-500 text-black text-xs sm:text-sm font-bold uppercase flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(0,240,255,0.4)] hover:bg-cyan-400 hover:shadow-[0_0_30px_rgba(0,240,255,0.6)] transition-all"
                    >
                      <Swords className="w-4 h-4 sm:w-5 sm:h-5" /> QUICK MATCH
                    </button>
                    <button
                      onClick={() => { onSelectLevel(CAMPAIGN_LEVELS[0]); onOpenMapEditor?.(); }}
                      className="flex-1 py-3 sm:py-4 rounded-lg bg-white/5 text-white hover:bg-white/10 text-xs sm:text-sm font-bold uppercase border border-white/10 flex items-center justify-center gap-2 transition-all"
                    >
                      <Settings className="w-4 h-4 sm:w-5 sm:h-5 text-white/50" /> MAP EDITOR
                    </button>
                  </div>
                </div>
              </div>
            )}

            {tab === 'custom' && (
              <div className="flex flex-col gap-2 w-full h-full overflow-y-auto no-scrollbar touch-pan-y p-1">
                 {customMaps.length === 0 ? (
                    <div className="flex flex-col items-center justify-center text-white/40 h-full gap-3 sm:gap-4 p-4">
                      <Map className="w-10 h-10 sm:w-16 sm:h-16 opacity-30" />
                      <p className="text-xs sm:text-sm font-orbitron tracking-widest uppercase mb-2">No custom maps found</p>
                      <button
                        onClick={() => { onSelectLevel(CAMPAIGN_LEVELS[0]); onOpenMapEditor?.(); }}
                        className="px-6 py-3 sm:py-4 rounded-lg bg-white/5 hover:bg-white/10 text-white text-xs sm:text-sm font-bold uppercase border border-white/10 flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(255,255,255,0.05)]"
                      >
                        <Plus className="w-4 h-4 sm:w-5 sm:h-5 text-white/50" /> CREATE MAP
                      </button>
                    </div>
                 ) : (
                   <div className="flex flex-col h-full w-full">
                     {/* Cards Grid */}
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 overflow-y-auto no-scrollbar pb-4 px-1 sm:px-2">
                        {customMaps.map(m => (
                          <div key={m.id} className="p-4 sm:p-5 rounded-xl bg-black/40 border border-white/10 flex flex-col gap-3 sm:gap-4 hover:bg-white/5 transition-colors">
                            <div className="flex justify-between items-center border-b border-white/10 pb-2">
                              <span className="font-orbitron font-bold text-white text-xs sm:text-sm truncate pr-2">{m.name}</span>
                              <span className="text-[9px] sm:text-[10px] text-white/50 tracking-widest uppercase shrink-0">{m.planets.length} PLANETS</span>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => {
                                  onSelectLevel({ id: m.id, name: m.name, description: 'Custom', difficulty: 'Custom', width: 1200, height: 800, planets: m.planets, activeFactions: Array.from(new Set(m.planets.map(p => p.owner))) });
                                  onClose();
                                }}
                                className="flex-1 py-2 sm:py-3 rounded-lg bg-white text-black text-[10px] sm:text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-1.5 hover:bg-gray-200 transition-colors shadow-[0_0_10px_rgba(255,255,255,0.2)]"
                              >
                                <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-current" /> PLAY
                              </button>
                              <button
                                onClick={() => { onOpenMapEditor?.(m); onClose(); }}
                                className="px-4 py-2 sm:py-3 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors"
                              >
                                <Settings className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => { deleteCustomMap(m.id); setCustomMaps(getCustomMaps()); }}
                                className="px-4 py-2 sm:py-3 rounded-lg bg-red-500/20 text-red-500 hover:bg-red-500/30 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                     </div>

                     {/* Footer Action */}
                     <div className="flex justify-center mt-2 mb-4 shrink-0 px-1 sm:px-2">
                        <button
                          onClick={() => { onSelectLevel(CAMPAIGN_LEVELS[0]); onOpenMapEditor?.(); }}
                          className="px-6 py-3 sm:px-8 sm:py-4 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 text-[10px] sm:text-xs font-bold uppercase border border-cyan-500/30 flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(0,240,255,0.1)] w-full sm:w-auto"
                        >
                          <Plus className="w-4 h-4 sm:w-5 sm:h-5" /> CREATE NEW MAP
                        </button>
                     </div>
                   </div>
                 )}
              </div>
            )}
          </div>
        </div>
        
        {/* Desktop Footer (Hidden on Mobile) */}
        <div className="hidden [@media(min-width:768px)_and_(min-height:550px)]:block shrink-0 mt-4 mb-auto pb-4">
          <div className="text-center text-white/50 text-[9px] font-orbitron tracking-widest uppercase px-4 leading-tight">
            This is a free, open-source homage to classic RTS mechanics.<br/>
            Not affiliated with or endorsed by any original rights holders.
          </div>
          <div className="mt-2 text-center text-white/30 text-[10px] font-orbitron tracking-widest uppercase pointer-events-auto">
            Made with 🗿 by <a href="https://serverket.dev" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Serverket</a>
          </div>
        </div>
      </div>
    </div>
  );
};
