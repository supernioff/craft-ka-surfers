import React, { useEffect, useState } from 'react';
import { sound } from '../sound/audio.ts';
import { Sparkles } from 'lucide-react';

interface CinematicIntroProps {
  onComplete: () => void;
}

export const CinematicIntro: React.FC<CinematicIntroProps> = ({ onComplete }) => {
  // Cinematic phases: 'burst' (flying out of screen) -> 'blackout' (slow turn to black) -> 'done'
  const [phase, setPhase] = useState<'burst' | 'blackout' | 'done'>('burst');

  useEffect(() => {
    // Play dramatic intro burst
    try {
      sound.playIntroBurst();
    } catch {}

    // Title flies out and holds majestically for 2.2 seconds
    const blackTimer = setTimeout(() => {
      setPhase('blackout');
    }, 2200);

    // Fade to black completes at 3.6s total, transitioning automatically into the game
    const doneTimer = setTimeout(() => {
      setPhase('done');
      onComplete();
    }, 3600);

    return () => {
      clearTimeout(blackTimer);
      clearTimeout(doneTimer);
    };
  }, [onComplete]);

  if (phase === 'done') return null;

  return (
    <div
      id="cinematic-game-intro"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black overflow-hidden select-none"
    >
      {/* Background Bedrock Ambience & Revolving Golden Rays */}
      <div className="absolute inset-0 bg-[#0a0b10] flex items-center justify-center overflow-hidden">
        <div
          className="absolute w-[800px] h-[800px] sm:w-[1300px] sm:h-[1300px] opacity-30 animate-god-rays pointer-events-none"
          style={{
            background:
              'conic-gradient(from 0deg, transparent 0deg, rgba(245, 158, 11, 0.25) 25deg, transparent 50deg, rgba(56, 189, 248, 0.25) 75deg, transparent 100deg, rgba(245, 158, 11, 0.25) 125deg, transparent 150deg, rgba(56, 189, 248, 0.25) 175deg, transparent 200deg, rgba(245, 158, 11, 0.25) 225deg, transparent 250deg, rgba(56, 189, 248, 0.25) 275deg, transparent 300deg, rgba(245, 158, 11, 0.25) 325deg, transparent 350deg)',
          }}
        />

        {/* Floating Sparkle Embers */}
        <div className="absolute inset-0 pointer-events-none">
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 bg-amber-300 rounded-sm opacity-60 animate-ping"
              style={{
                top: `${12 + (i * 17) % 75}%`,
                left: `${8 + (i * 23) % 84}%`,
                animationDuration: `${1.4 + (i % 3)}s`,
                animationDelay: `${(i % 5) * 0.15}s`,
              }}
            />
          ))}
        </div>
      </div>

      {/* Main 3D Title "CRAFT KA SURFERS" Flying Out Of Screen */}
      <div className="relative z-10 flex flex-col items-center justify-center text-center px-4">
        <div className="animate-title-flyout relative flex flex-col items-center">
          {/* Sub-Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-black/60 border border-amber-400/60 rounded-full text-[10px] sm:text-xs font-minecraft text-amber-300 mb-3 shadow-2xl">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-spin" />
            <span>OFFICIAL 3D VOXEL RUNNER</span>
            <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-spin" />
          </div>

          {/* Extruded 3D Minecraft Block Title */}
          <div className="flex flex-col items-center gap-1 sm:gap-2">
            <div className="flex items-center justify-center tracking-wider text-2xl min-[360px]:text-3xl sm:text-5xl md:text-7xl font-minecraft font-extrabold select-none">
              <span className="mc-block-letter text-gray-100">C</span>
              <span className="mc-block-letter text-gray-100">R</span>
              <span className="mc-block-letter text-gray-100">A</span>
              <span className="mc-block-letter text-gray-100">F</span>
              <span className="mc-block-letter text-gray-100">T</span>
              <span className="mx-1.5 sm:mx-3 text-cyan-400 font-minecraft">KA</span>
            </div>

            <div className="flex items-center justify-center tracking-wider text-2xl min-[360px]:text-3xl sm:text-5xl md:text-7xl font-minecraft font-extrabold select-none">
              <span className="mc-block-letter text-amber-400">S</span>
              <span className="mc-block-letter text-amber-400">U</span>
              <span className="mc-block-letter text-amber-400">R</span>
              <span className="mc-block-letter text-amber-400">F</span>
              <span className="mc-block-letter text-amber-400">E</span>
              <span className="mc-block-letter text-amber-400">R</span>
              <span className="mc-block-letter text-amber-400">S</span>
            </div>
          </div>

          {/* Centered Golden Slogan */}
          <div className="text-yellow-300 font-minecraft text-xs sm:text-sm font-bold mt-4 tracking-wider text-center drop-shadow">
            ★ SURF THE INFINITE VOXEL CANYON ★
          </div>
        </div>
      </div>

      {/* Cinematic Slow Fade To Black Overlay */}
      {phase === 'blackout' && (
        <div className="absolute inset-0 z-30 bg-black animate-fade-to-black pointer-events-none" />
      )}
    </div>
  );
};
