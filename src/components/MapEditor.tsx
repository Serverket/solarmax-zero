import React, { useState } from 'react';
import { GameCanvas } from './GameCanvas';
import type { Planet, PlanetType, FactionId } from '../types/game';
import { FACTIONS } from '../utils/levels';
import { Pencil, Play, Trash2, Link as LinkIcon, Crosshair, Hexagon, Circle } from 'lucide-react';

interface MapEditorProps {
  initialPlanets: Planet[];
  initialMapId?: string;
  initialMapName?: string;
  onStartGame: (planets: Planet[], mapId?: string, mapName?: string) => void;
  onExit: () => void;
  settingsMenu?: React.ReactNode;
}

export const MapEditor: React.FC<MapEditorProps> = ({ initialPlanets, initialMapId, initialMapName, onStartGame, onExit, settingsMenu }) => {
  const [planets, setPlanets] = useState<Planet[]>(initialPlanets);
  const [mapName, setMapName] = useState(initialMapName || `Custom Map ${new Date().toLocaleTimeString()}`);
  const [selectedPlanetId, setSelectedPlanetId] = useState<string | null>(null);
  const [tool, setTool] = useState<'select' | 'add_standard' | 'add_mothership' | 'add_turret' | 'add_portal' | 'link_portal' | 'delete'>('select');
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

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
    if (tool === 'select' && planetId) {
      const p = planets.find(p => p.id === planetId);
      if (p) {
        setIsDragging(true);
        setDragOffset({ x: p.x - x, y: p.y - y });
      }
    }
  };

  const handleEditorPointerMove = (x: number, y: number) => {
    if (tool === 'select' && isDragging && selectedPlanetId) {
      updateSelected({ x: x + dragOffset.x, y: y + dragOffset.y });
    }
  };

  const handleEditorPointerUp = () => {
    setIsDragging(false);
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
          onEditorPointerMove={handleEditorPointerMove}
          onEditorPointerUp={handleEditorPointerUp}
        />
        

      </div>

      {/* Top Toolbar */}
      <div className="relative z-10 glass-panel-glow-white bg-black/50 p-2 sm:p-4 pt-[max(env(safe-area-inset-top),0.5rem)] flex justify-between items-center border-b border-white/10 shadow-lg">
        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          <Pencil className="w-5 h-5 text-white/50 hidden md:block" />
          <input 
            type="text" 
            value={mapName}
            onChange={(e) => setMapName(e.target.value)}
            className="text-lg sm:text-xl font-orbitron font-bold text-white tracking-widest uppercase bg-transparent border-b border-white/20 focus:border-white outline-none w-32 sm:w-64 glow-white"
            placeholder="MAP NAME"
            maxLength={30}
          />
        </div>
        
        <div className="flex flex-nowrap justify-start sm:justify-center gap-1 sm:gap-2 overflow-x-auto no-scrollbar mx-2 flex-1">
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

        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          {settingsMenu}
          <div className="flex flex-nowrap gap-1 sm:gap-4">
            <button onClick={onExit} className="px-2 sm:px-6 py-2 rounded bg-white/10 hover:bg-white/20 text-white text-[10px] sm:text-xs font-bold uppercase tracking-widest transition-all">
              Cancel
            </button>
          <button 
            onClick={() => {
              const hasPlayer = planets.some(p => p.owner === 'player');
              const hasEnemy = planets.some(p => p.owner !== 'player' && p.owner !== 'neutral');
              
              if (!hasPlayer) {
                alert("Invalid Map: You must place at least one player (blue) planet.");
                return;
              }
              if (!hasEnemy) {
                alert("Invalid Map: You must place at least one enemy planet.");
                return;
              }
              
              onStartGame(planets, initialMapId, mapName);
            }} 
            className="px-2 sm:px-6 py-2 rounded bg-white hover:bg-gray-200 text-black text-[10px] sm:text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-2 shadow-[0_0_15px_rgba(255,255,255,0.4)]"
          >
            <Play className="w-4 h-4 fill-current hidden sm:block" /> <span className="hidden sm:inline">{initialMapId ? 'Save & Play' : 'Initialize'}</span>
            <Play className="w-3 h-3 fill-current sm:hidden" />
          </button>
          </div>
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
            <label className="text-[10px] text-white/50 tracking-widest uppercase flex justify-between mb-1">
              <span>Radius (Size)</span>
              <span>{selectedPlanet.radius}</span>
            </label>
            <input 
              type="range" min="15" max="60" 
              value={selectedPlanet.radius} 
              onChange={e => updateSelected({ radius: parseInt(e.target.value), productionRate: parseInt(e.target.value) / 10 })}
              className="w-full accent-white h-1 bg-white/20 appearance-none rounded"
            />
          </div>

          <div>
            <label className="text-[10px] text-white/50 tracking-widest uppercase flex justify-between mb-1">
              <span>Starting Ships</span>
              <span>{Math.floor(selectedPlanet.ships)} / {selectedPlanet.maxShips}</span>
            </label>
            <input 
              type="range" min="0" max={selectedPlanet.maxShips} 
              value={Math.floor(selectedPlanet.ships)} 
              onChange={e => updateSelected({ ships: parseInt(e.target.value) })}
              className="w-full accent-[#00f0ff] h-1 bg-white/20 appearance-none rounded"
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
