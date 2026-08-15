import React, { useState } from 'react';
import { Settings } from 'lucide-react';

interface SettingsMenuProps {
  sfxVolume: number;
  onSetSfxVolume: (vol: number) => void;
  musicVolume: number;
  onSetMusicVolume: (vol: number) => void;
}

export const SettingsMenu: React.FC<SettingsMenuProps> = ({
  sfxVolume,
  onSetSfxVolume,
  musicVolume,
  onSetMusicVolume,
}) => {
  const [showSettings, setShowSettings] = useState(false);

  return (
    <div className="fixed top-[max(env(safe-area-inset-top),1rem)] right-[max(env(safe-area-inset-right),1rem)] z-50">
      <button
        onClick={() => setShowSettings(!showSettings)}
        className={`p-2 rounded-lg transition-all cursor-pointer backdrop-blur-md border border-white/10 shadow-lg ${
          showSettings ? 'bg-white/30 text-white' : 'bg-black/40 hover:bg-black/60 text-white/70'
        }`}
        title="Audio Settings"
      >
        <Settings className="w-5 h-5" />
      </button>
      
      {showSettings && (
        <div className="absolute top-10 sm:top-12 right-0 bg-black/80 backdrop-blur-md border border-white/10 shadow-2xl rounded-lg p-3 sm:p-4 flex flex-col gap-3 sm:gap-4 w-48 sm:w-56 z-50 pointer-events-auto origin-top-right">
          <div className="flex justify-between items-center border-b border-white/10 pb-2 mb-1 text-white/90 font-orbitron text-sm tracking-wider">
            AUDIO CONFIG
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center text-xs font-medium text-white/70">
              <span>SFX Volume</span>
              <span>{Math.round(sfxVolume * 100)}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={sfxVolume}
              onChange={e => onSetSfxVolume(parseFloat(e.target.value))}
              className="w-full accent-cyan-400 cursor-pointer"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center text-xs font-medium text-white/70">
              <span>Music Volume</span>
              <span>{Math.round(musicVolume * 100)}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={musicVolume}
              onChange={e => onSetMusicVolume(parseFloat(e.target.value))}
              className="w-full accent-cyan-400 cursor-pointer"
            />
          </div>
        </div>
      )}
    </div>
  );
};
