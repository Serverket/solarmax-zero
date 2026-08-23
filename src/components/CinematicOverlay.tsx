import React, { useEffect, useState } from 'react';

interface CinematicOverlayProps {
  onComplete: () => void;
}

export const CinematicOverlay: React.FC<CinematicOverlayProps> = ({ onComplete }) => {
  const [phase, setPhase] = useState<'initial' | 'expanding' | 'whiteout' | 'done'>('initial');

  useEffect(() => {
    // Sequence timing
    const t1 = setTimeout(() => setPhase('expanding'), 100);
    const t2 = setTimeout(() => setPhase('whiteout'), 1800);
    const t3 = setTimeout(() => {
      setPhase('done');
      onComplete();
    }, 3500);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [onComplete]);

  if (phase === 'done') return null;

  return (
    <div className="fixed inset-0 z-[60] pointer-events-none flex items-center justify-center overflow-hidden">
      {/* Heavy screen shake container */}
      <div className={`w-full h-full flex items-center justify-center ${phase === 'expanding' ? 'animate-shake-extreme' : ''}`}>
        
        {/* The expanding energy ring */}
        <div 
          className={`absolute border-[10vw] border-white rounded-full transition-transform ease-in opacity-80
            ${phase === 'initial' ? 'scale-0 duration-0' : ''}
            ${phase === 'expanding' ? 'scale-[20] duration-[1.7s]' : ''}
            ${phase === 'whiteout' ? 'scale-[20] duration-0 opacity-0' : ''}
          `}
          style={{ width: '10vw', height: '10vw', boxShadow: '0 0 100px 50px #00f0ff, inset 0 0 100px 50px #00f0ff' }}
        />

        {/* The pure whiteout fade */}
        <div 
          className={`absolute inset-0 bg-white transition-opacity ease-out
            ${phase === 'initial' || phase === 'expanding' ? 'opacity-0 duration-[1s]' : ''}
            ${phase === 'whiteout' ? 'opacity-100 duration-[1.5s]' : ''}
          `}
        />
      </div>
    </div>
  );
};
