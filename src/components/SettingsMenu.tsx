import React, { useState } from 'react';
import { Settings, User, Shield } from 'lucide-react';

interface SettingsMenuProps {
  sfxVolume: number;
  onSetSfxVolume: (vol: number) => void;
  musicVolume: number;
  onSetMusicVolume: (vol: number) => void;
  onOpenAuth: () => void;
  onOpenAdmin: () => void;
  dropdownClassName?: string;
}

export const SettingsMenu: React.FC<SettingsMenuProps> = ({
  sfxVolume,
  onSetSfxVolume,
  musicVolume,
  onSetMusicVolume,
  onOpenAuth,
  onOpenAdmin,
  dropdownClassName,
}) => {
  const [showSettings, setShowSettings] = useState(false);

  return (
    <div className="relative z-50 shrink-0">
      <div className="flex items-center gap-2 group">
        <button
          onClick={onOpenAuth}
          className="p-2 rounded-lg bg-black/40 hover:bg-white/20 text-white/70 hover:text-white transition-all cursor-pointer backdrop-blur-md border border-white/10 shadow-lg flex items-center justify-center"
          title="Player Profile"
        >
          <User className="w-5 h-5" />
        </button>

        <div className="overflow-hidden transition-all duration-500 max-w-0 opacity-0 group-hover:max-w-[50px] group-hover:opacity-100 group-hover:ml-0 flex">
          <button
            onClick={onOpenAdmin}
            className="p-2 rounded-lg bg-black/40 hover:bg-cyan-500/20 text-cyan-400/50 hover:text-cyan-400 transition-all cursor-pointer backdrop-blur-md border border-cyan-500/30 shadow-lg shrink-0 flex items-center justify-center hover:shadow-[0_0_15px_rgba(0,240,255,0.4)]"
            title="Fleet Command (Admin)"
          >
            <Shield className="w-5 h-5" />
          </button>
        </div>

        <button
          onClick={() => setShowSettings(!showSettings)}
          className={`p-2 rounded-lg transition-all cursor-pointer backdrop-blur-md border border-white/10 shadow-lg flex items-center justify-center ${
            showSettings ? 'bg-white/30 text-white' : 'bg-black/40 hover:bg-black/60 text-white/70'
          }`}
          title="Audio Settings"
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>
      
      {showSettings && (
        <>
          <div 
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 cursor-default" 
            onClick={() => setShowSettings(false)} 
          />
          <div className={`absolute bg-black/80 backdrop-blur-md border border-white/10 shadow-2xl rounded-lg p-3 sm:p-4 flex flex-col gap-3 sm:gap-4 w-48 sm:w-56 z-50 pointer-events-auto ${dropdownClassName || 'top-10 sm:top-12 right-0 origin-top-right'}`}>
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
        </>
      )}
    </div>
  );
};
