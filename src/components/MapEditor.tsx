import React, { useState } from 'react';
import { GameCanvas } from './GameCanvas';
import type { Planet, PlanetType, FactionId } from '../types/game';
import { FACTIONS } from '../utils/levels';
import { Settings, Play, Trash2, Link as LinkIcon, Crosshair, Hexagon, Circle } from 'lucide-react';

interface MapEditorProps {
  initialPlanets: Planet[];
  onStartGame: (planets: Planet[]) => void;
  onExit: () => void;
}

export const MapEditor: React.FC<MapEditorProps> = ({ initialPlanets, onStartGame, onExit }) => {
  const [planets, setPlanets] = useState<Planet[]>(initialPlanets);
  const [selectedPlanetId, setSelectedPlanetId] = useState<string | null>(null);
  const [tool, setTool] = useState<'select' | 'add_standard' | 'add_mothership' | 'add_turret' | 'add_portal' | 'link_portal' | 'delete'>('select');

  const handleEditorClick = (planetId: string | null, x: number, y: number) => {
    if (tool === 'delete' && planetId) {
      setPlanets(prev => prev.filter(p => p.id !== planetId));
      setSelectedPlanetId(null);
      return;
    }

    if (tool === 'link_portal' && selectedPlanetId && planetId && planetId !== selectedPlanetId) {
      const sp = planets.find(p => p.id === selectedPlanetId);
      const tp = planets.find(p => p.id === planetId);
      if (sp?.type === 'portal' && tp?.type === 'portal') {
        // Link them
        setPlanets(prev => prev.map(p => {
          if (p.id === sp.id) return { ...p, portalTargetId: tp.id };
          if (p.id === tp.id) return { ...p, portalTargetId: sp.id };
          return p;
        }));
        setTool('select');
      }
      return;
    }

    if (tool.startsWith('add_')) {
      const type = tool.replace('add_', '') as PlanetType;
      let radius = 25;
      if (type === 'mothership') radius = 35;
      if (type === 'portal') radius = 30;
      
      // Prevent overlapping planets
      const hasCollision = planets.some(p => {
         const dist = Math.sqrt((p.x - x)**2 + (p.y - y)**2);
         return dist < (p.radius + radius + 10); // 10px minimum padding
      });
      if (hasCollision) return;

      const newPlanet: Planet = {
        id: `planet-${Date.now()}`,
        name: `Node ${planets.length + 1}`,
        x, y,
        radius,
        maxShips: type === 'mothership' ? 200 : 100,
        ships: 50,
        owner: 'neutral',
        type,
        productionRate: radius / 10,
        captureProgress: 0,
        capturingFaction: null,
        inCombat: false,
        pulsePhase: 0
      };
      setPlanets(prev => [...prev, newPlanet]);
      setTool('select');
      setSelectedPlanetId(newPlanet.id);
      return;
    }

    // Select mode
    setSelectedPlanetId(planetId);
  };

  const selectedPlanet = planets.find(p => p.id === selectedPlanetId);

  const updateSelected = (updates: Partial<Planet>) => {
    if (!selectedPlanetId) return;
    setPlanets(prev => prev.map(p => p.id === selectedPlanetId ? { ...p, ...updates } : p));
  };

  const factions: FactionId[] = ['neutral', 'player', 'ai1', 'ai2', 'ai3', 'ai4'];

  return (
    <div className="absolute inset-0 z-40 flex flex-col bg-[#0a0a14]">
      {/* Canvas Layer */}
      <div className="absolute inset-0 z-0">
        <GameCanvas
          planets={planets}
          ships={[]}
          sparks={[]}
          lasers={[]}
          screenShake={0}
          selectedPlanetIds={selectedPlanetId ? [selectedPlanetId] : []}
          onSelectPlanets={() => {}}
          onLaunchFleets={() => {}}
          isEditorMode={true}
          onEditorClick={handleEditorClick}
        />
        
        {/* Draw Link Lines for Portals */}
        <svg className="absolute inset-0 pointer-events-none w-full h-full">
          {planets.filter(p => p.type === 'portal' && p.portalTargetId).map(p => {
            const target = planets.find(t => t.id === p.portalTargetId);
            if (!target) return null;
            return (
              <line 
                key={`${p.id}-${target.id}`} 
                x1={p.x} y1={p.y} x2={target.x} y2={target.y} 
                stroke="#64b4ff" strokeWidth="2" strokeDasharray="5,5" opacity="0.5" 
              />
            );
          })}
        </svg>
      </div>

      {/* Top Toolbar */}
      <div className="relative z-10 glass-panel-glow-white bg-black/50 p-2 sm:p-4 pt-[max(env(safe-area-inset-top),0.5rem)] flex flex-nowrap gap-2 sm:gap-4 justify-between items-center border-b border-white/10 shadow-lg overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-4">
          <Settings className="w-5 h-5 text-white/50" />
          <h1 className="text-xl font-orbitron font-bold text-white tracking-widest uppercase glow-white hidden sm:block">Map Editor</h1>
        </div>
        
        <div className="flex flex-nowrap justify-center gap-1 sm:gap-2 shrink-0">
          <button 
            onClick={() => setTool('select')} 
            className={`px-2 sm:px-4 py-1.5 sm:py-2 rounded text-[10px] sm:text-xs font-bold uppercase tracking-widest transition-all ${tool === 'select' ? 'bg-white text-black' : 'bg-white/10 text-white/70 hover:bg-white/20'}`}
          >
            <span className="hidden md:inline">Select</span>
          </button>
          <button 
            onClick={() => setTool('add_standard')} 
            className={`px-2 sm:px-4 py-1.5 sm:py-2 rounded text-[10px] sm:text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-1 sm:gap-2 ${tool === 'add_standard' ? 'bg-white text-black' : 'bg-white/10 text-white/70 hover:bg-white/20'}`}
          >
            <Circle className="w-4 h-4" /> <span className="hidden md:inline">Planet</span>
          </button>
          <button 
            onClick={() => setTool('add_mothership')} 
            className={`px-2 sm:px-4 py-1.5 sm:py-2 rounded text-[10px] sm:text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-1 sm:gap-2 ${tool === 'add_mothership' ? 'bg-white text-black' : 'bg-white/10 text-white/70 hover:bg-white/20'}`}
          >
            <Hexagon className="w-4 h-4" /> <span className="hidden md:inline">Mothership</span>
          </button>
          <button 
            onClick={() => setTool('add_turret')} 
            className={`px-2 sm:px-4 py-1.5 sm:py-2 rounded text-[10px] sm:text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-1 sm:gap-2 ${tool === 'add_turret' ? 'bg-white text-black' : 'bg-white/10 text-white/70 hover:bg-white/20'}`}
          >
            <Crosshair className="w-4 h-4" /> <span className="hidden md:inline">Turret</span>
          </button>
          <button 
            onClick={() => setTool('add_portal')} 
            className={`px-2 sm:px-4 py-1.5 sm:py-2 rounded text-[10px] sm:text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-1 sm:gap-2 ${tool === 'add_portal' ? 'bg-white text-black' : 'bg-white/10 text-white/70 hover:bg-white/20'}`}
          >
            <LinkIcon className="w-4 h-4" /> <span className="hidden md:inline">Portal</span>
          </button>
          <button 
            onClick={() => setTool('delete')} 
            className={`px-2 sm:px-4 py-1.5 sm:py-2 rounded text-[10px] sm:text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-1 sm:gap-2 ${tool === 'delete' ? 'bg-red-500 text-white' : 'bg-white/10 text-white/70 hover:bg-white/20'}`}
          >
            <Trash2 className="w-4 h-4" /> <span className="hidden md:inline">Delete</span>
          </button>
        </div>

        <div className="flex flex-nowrap gap-1 sm:gap-4 shrink-0">
          <button onClick={onExit} className="px-4 sm:px-6 py-2 rounded bg-white/10 hover:bg-white/20 text-white text-xs font-bold uppercase tracking-widest transition-all">
            Cancel
          </button>
          <button onClick={() => onStartGame(planets)} className="px-4 sm:px-6 py-2 rounded bg-white hover:bg-gray-200 text-black text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-2 shadow-[0_0_15px_rgba(255,255,255,0.4)]">
            <Play className="w-4 h-4 fill-current" /> <span className="hidden sm:inline">Initialize</span>
          </button>
        </div>
      </div>

      {/* Properties Panel */}
      {selectedPlanet && (
        <div className="absolute right-2 sm:right-6 top-16 sm:top-24 z-10 w-52 sm:w-64 glass-panel-glow-white rounded-xl p-2 sm:p-4 flex flex-col gap-2 sm:gap-4 origin-top-right">
          <h3 className="text-sm font-orbitron font-bold text-white tracking-widest uppercase border-b border-white/20 pb-2">Properties</h3>
          
          <div>
            <label className="text-[10px] text-white/50 tracking-widest uppercase block mb-1">Owner Faction</label>
            <div className="flex flex-wrap gap-1">
              {factions.map(f => (
                <button
                  key={f}
                  onClick={() => updateSelected({ owner: f })}
                  className={`w-8 h-8 rounded border-2 transition-all ${selectedPlanet.owner === f ? 'border-white' : 'border-transparent'}`}
                  style={{ backgroundColor: FACTIONS[f].color }}
                  title={f}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="text-[10px] text-white/50 tracking-widest uppercase block mb-1">Radius (Size)</label>
            <input 
              type="range" min="15" max="60" 
              value={selectedPlanet.radius} 
              onChange={e => updateSelected({ radius: parseInt(e.target.value), productionRate: parseInt(e.target.value) / 10 })}
              className="w-full accent-white h-1 bg-white/20 appearance-none rounded"
            />
          </div>

          {selectedPlanet.type === 'portal' && (
            <div className="flex flex-col gap-2">
              <button
                onClick={() => setTool('link_portal')}
                className={`w-full py-2 rounded text-xs font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${tool === 'link_portal' ? 'bg-white text-black' : 'bg-white/10 hover:bg-white/20 text-white'}`}
              >
                <LinkIcon className="w-4 h-4" /> Link to Portal
              </button>
              {selectedPlanet.portalTargetId && (
                <button
                  onClick={() => updateSelected({ portalTargetId: undefined })}
                  className="w-full py-2 rounded text-xs font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 bg-red-500/20 hover:bg-red-500 text-white"
                >
                  <Trash2 className="w-4 h-4" /> Unlink
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
