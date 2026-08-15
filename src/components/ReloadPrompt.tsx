import React from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw, X } from 'lucide-react';

export const ReloadPrompt: React.FC = () => {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('SW Registered:', r);
    },
    onRegisterError(error) {
      console.log('SW registration error', error);
    },
  });

  const close = () => {
    setNeedRefresh(false);
  };

  if (!needRefresh) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-2 sm:p-4 pb-16 sm:pb-24 pointer-events-none flex justify-center animate-in slide-in-from-bottom-10 fade-in duration-500">
      <div className="glass-panel border border-[#00f0ff]/30 rounded-2xl p-4 w-full max-w-lg pointer-events-auto flex items-center gap-3 sm:gap-4 shadow-[0_0_40px_rgba(0,240,255,0.2)] bg-black/80 backdrop-blur-xl">
        <div className="p-2 sm:p-3 bg-[#00f0ff]/10 rounded-xl shrink-0">
          <RefreshCw className="w-5 h-5 sm:w-6 sm:h-6 text-[#00f0ff]" />
        </div>
        <div className="flex-1">
          <h3 className="font-orbitron font-bold text-white text-xs sm:text-sm tracking-widest">UPDATE AVAILABLE</h3>
          <p className="text-white/70 text-[10px] sm:text-xs">New transmission received. Reload to apply.</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button 
            onClick={() => updateServiceWorker(true)} 
            className="px-3 sm:px-4 py-2 bg-[#00f0ff] hover:bg-[#00f0ff]/80 text-black font-bold text-[10px] sm:text-xs uppercase tracking-widest rounded-lg shadow-[0_0_15px_rgba(0,240,255,0.4)] transition-all cursor-pointer"
          >
            RELOAD
          </button>
          <button 
            onClick={close} 
            className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
