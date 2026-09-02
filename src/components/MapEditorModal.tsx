import React, { useState } from 'react';
import { X, Plus, Trash2, Play, Zap } from 'lucide-react';
import type { LevelConfig, Planet, FactionId, PlanetType } from '../types/game';
import { FACTIONS } from '../utils/levels';

interface MapEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLaunchCustomMap: (level: LevelConfig) => void;
}

export const MapEditorModal: React.FC<MapEditorModalProps> = ({
  isOpen,
  onClose,
  onLaunchCustomMap,
}) => {
  const [planets, setPlanets] = useState<Planet[]>([
    { id: 'custom-1', name: 'Terran HQ', x: 0.2, y: 0.5, radius: 34, maxShips: 50, ships: 30, owner: 'player', type: 'standard', productionRate: 1.4, pulsePhase: 0, captureProgress: 0, capturingFaction: null, inCombat: false, turretCooldown: 0 },
    { id: 'custom-2', name: 'Crimson Base', x: 0.8, y: 0.5, radius: 34, maxShips: 50, ships: 30, owner: 'ai1', type: 'standard', productionRate: 1.4, pulsePhase: 1, captureProgress: 0, capturingFaction: null, inCombat: false, turretCooldown: 0 },
    { id: 'custom-3', name: 'Core Outpost', x: 0.5, y: 0.5, radius: 40, maxShips: 80, ships: 20, owner: 'neutral', type: 'standard', productionRate: 2.0, pulsePhase: 2, captureProgress: 0, capturingFaction: null, inCombat: false, turretCooldown: 0 },
  ]);

  if (!isOpen) return null;

  const handleAddPlanet = () => {
    if (planets.length >= 14) return;
    const newPlanet: Planet = {
      id: `custom-${Date.now()}`,
      name: `Node ${planets.length + 1}`,
      x: 0.3 + Math.random() * 0.4,
      y: 0.3 + Math.random() * 0.4,
      radius: 28,
      maxShips: 40,
      ships: 15,
      owner: 'neutral',
      type: 'standard',
      productionRate: 1.0,
      pulsePhase: Math.random() * Math.PI * 2,
      captureProgress: 0,
      capturingFaction: null,
      inCombat: false,
      turretCooldown: 0
    };
    setPlanets([...planets, newPlanet]);
  };

  const handleUpdatePlanet = (id: string, updates: Partial<Planet>) => {
    setPlanets(planets.map(p => (p.id === id ? { ...p, ...updates } : p)));
  };

  const handleRemovePlanet = (id: string) => {
    setPlanets(planets.filter(p => p.id !== id));
  };

  const handleLaunch = () => {
    const customConfig: LevelConfig = {
      id: `editor-${Date.now()}`,
      name: 'Sandbox Custom Level',
      description: 'Player crafted tactical battle',
      difficulty: 'Medium',
      width: 1200,
      height: 800,
      activeFactions: Array.from(new Set(planets.map(p => p.owner))),
      planets,
    };
    onLaunchCustomMap(customConfig);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 pb-[calc(env(safe-area-inset-bottom,0px)+0.5rem)] bg-slate-950/85 backdrop-blur-md overflow-hidden touch-none">
      <div className="w-full max-w-4xl glass-panel border border-amber-500/30 rounded-3xl p-4 sm:p-8 flex flex-col max-h-full min-h-0 shadow-[0_0_50px_rgba(245,158,11,0.25)]">
        <div className="flex justify-between items-center pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Zap className="w-6 h-6 text-amber-400" />
            <h2 className="text-xl font-orbitron font-bold text-white glow-gold">SYSTEM MAP EDITOR</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-hidden touch-none my-2 sm:my-4 pr-1 sm:pr-2 space-y-2 sm:space-y-3 min-h-0">
          {planets.map((planet, idx) => (
            <div key={planet.id} className="glass-panel p-3 rounded-xl border border-slate-800 flex flex-wrap sm:flex-nowrap items-center gap-3">
              <span className="font-orbitron font-bold text-xs text-amber-400 w-6">#{idx + 1}</span>

              <select
                value={planet.owner}
                onChange={e => handleUpdatePlanet(planet.id, { owner: e.target.value as FactionId })}
                className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg px-2 py-1 font-orbitron cursor-pointer"
              >
                {(Object.keys(FACTIONS) as FactionId[]).map(f => (
                  <option key={f} value={f}>
                    {FACTIONS[f].name}
                  </option>
                ))}
              </select>

              <select
                value={planet.type}
                onChange={e => handleUpdatePlanet(planet.id, { type: e.target.value as PlanetType })}
                className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg px-2 py-1 font-orbitron cursor-pointer"
              >
                <option value="standard">Standard</option>
                <option value="forge">Forge (+Buff)</option>
                <option value="turret">Turret (Laser)</option>
                <option value="portal">Portal Gate</option>
              </select>

              <div className="flex-1 flex items-center gap-2">
                <span className="text-[10px] font-orbitron text-slate-400">SHIPS:</span>
                <input
                  type="range"
                  min={5}
                  max={80}
                  value={planet.ships}
                  onChange={e => handleUpdatePlanet(planet.id, { ships: parseInt(e.target.value) })}
                  className="flex-1 accent-amber-500 cursor-pointer"
                />
                <span className="font-orbitron text-xs text-white w-6 text-right">{planet.ships}</span>
              </div>

              <button
                onClick={() => handleRemovePlanet(planet.id)}
                disabled={planets.length <= 2}
                className="p-1.5 rounded-lg bg-rose-500/20 text-rose-400 hover:bg-rose-500 hover:text-white transition-all disabled:opacity-30 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        <div className="flex justify-between items-center pt-4 border-t border-slate-800">
          <button
            onClick={handleAddPlanet}
            disabled={planets.length >= 14}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 border border-amber-500/30 font-orbitron text-xs font-bold flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>ADD PLANET</span>
          </button>

          <button
            onClick={handleLaunch}
            className="px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-orbitron text-sm font-bold shadow-[0_0_20px_rgba(245,158,11,0.5)] flex items-center gap-2 cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>LAUNCH CUSTOM GAME</span>
          </button>
        </div>
      </div>
    </div>
  );
};
