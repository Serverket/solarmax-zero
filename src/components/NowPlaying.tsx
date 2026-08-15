import React, { useEffect, useState } from 'react';
import { music } from '../utils/music';

export const NowPlaying: React.FC = () => {
  const [trackName, setTrackName] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    
    const unsubscribe = music.subscribe((name) => {
      if (name) {
        setTrackName(name);
        setVisible(true);
        clearTimeout(timeout);
        // Slowly fade out after 10 seconds of showing the track name
        timeout = setTimeout(() => {
          setVisible(false);
        }, 10000);
      }
    });
    
    return () => {
      unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  return (
    <div 
      className={`fixed bottom-4 right-4 text-white/30 text-xs font-mono tracking-widest pointer-events-none transition-opacity duration-1000 z-50 ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      {trackName && `♪ Stellardrone - ${trackName}`}
    </div>
  );
};
