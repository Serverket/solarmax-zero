import React, { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export const InstallBanner: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent Chrome 67 and earlier from automatically showing the prompt
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('User accepted the A2HS prompt');
    }
    
    setDeferredPrompt(null);
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-2 sm:p-4 md:p-6 pb-2 sm:pb-4 md:pb-6 pointer-events-none flex justify-center">
      <div className="glass-panel-glow-white bg-black/60 backdrop-blur-xl rounded-2xl p-2 sm:p-4 md:p-6 w-full max-w-lg pointer-events-auto shadow-[0_0_40px_rgba(255,255,255,0.1)] border border-white/20 flex flex-row items-center gap-2 sm:gap-4 animate-in slide-in-from-bottom-10 fade-in duration-500">
        
        {/* App Icon */}
        <div className="w-10 h-10 sm:w-16 sm:h-16 rounded-xl bg-gradient-to-br from-gray-900 to-black border border-white/30 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(255,255,255,0.2)] overflow-hidden">
          <img src="/favicon.svg" alt="Solarmax Logo" className="w-8 h-8 sm:w-12 sm:h-12 drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
        </div>
        
        {/* Text content */}
        <div className="flex-1 text-left">
          <h3 className="font-orbitron font-bold text-white text-xs sm:text-lg tracking-wider">SOLARMAX ZERO</h3>
          <p className="text-white/70 text-[10px] sm:text-sm mt-0.5 sm:mt-1 leading-tight">Install app for offline tactical play.</p>
        </div>
        
        {/* Buttons */}
        <div className="flex gap-2 sm:gap-3 w-auto shrink-0">
          <button 
            onClick={() => setIsVisible(false)}
            className="p-2 sm:p-3 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
            aria-label="Close install prompt"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          <button 
            onClick={handleInstallClick}
            className="flex-none flex items-center justify-center gap-1 sm:gap-2 px-3 sm:px-6 py-2 sm:py-3 rounded-xl bg-white text-black font-bold uppercase tracking-widest text-[10px] sm:text-sm hover:bg-gray-200 transition-colors shadow-[0_0_20px_rgba(255,255,255,0.4)]"
          >
            <Download className="w-3 h-3 sm:w-4 sm:h-4" /> <span className="hidden sm:inline">Install</span>
          </button>
        </div>
        
      </div>
    </div>
  );
};
