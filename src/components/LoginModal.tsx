import React, { useState, useRef, useCallback } from 'react';
import { Pickaxe, LogIn, Dice5, User, Check, ShieldAlert, Move, RotateCcw, X } from 'lucide-react';
import { sound } from '../sound/audio.ts';

interface LoginModalProps {
  isOpen: boolean;
  currentId: string;
  currentName: string;
  onConfirm: (uniqueId: string, displayName: string) => void;
  onGoogleLogin?: () => void;
  googleUser?: any;
  onClose?: () => void;
}

const RANDOM_PREFIXES = [
  'Diamond', 'Nether', 'Obsidian', 'Redstone', 'Cave', 'Ender', 'Iron',
  'Golden', 'Pickaxe', 'Creeper', 'Miner', 'Emerald', 'GhostHunter'
];

const RANDOM_SUFFIXES = [
  'Steve', 'Alex', 'Striker', 'Runner', 'Digger', 'Master', 'Crafter',
  'Seeker', 'Pro', 'Legend', '99', '777', 'X'
];

export function generateRandomUniqueId(): string {
  const p = RANDOM_PREFIXES[Math.floor(Math.random() * RANDOM_PREFIXES.length)];
  const s = RANDOM_SUFFIXES[Math.floor(Math.random() * RANDOM_SUFFIXES.length)];
  const num = Math.floor(100 + Math.random() * 900);
  return `${p}_${s}_${num}`;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  currentId,
  currentName,
  onConfirm,
  onGoogleLogin,
  googleUser,
  onClose,
}) => {
  const [uniqueId, setUniqueId] = useState(() => currentId || generateRandomUniqueId());
  const [displayName, setDisplayName] = useState(() => currentName || uniqueId);
  const [error, setError] = useState('');

  // Draggable Window State
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ mouseX: 0, mouseY: 0, initialX: 0, initialY: 0 });

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button, input, select, a, [role="button"]')) {
      return;
    }
    isDraggingRef.current = true;
    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      initialX: dragOffset.x,
      initialY: dragOffset.y,
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }, [dragOffset]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - dragStartRef.current.mouseX;
    const dy = e.clientY - dragStartRef.current.mouseY;
    setDragOffset({
      x: dragStartRef.current.initialX + dx,
      y: dragStartRef.current.initialY + dy,
    });
  }, []);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    isDraggingRef.current = false;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
  }, []);

  if (!isOpen) return null;

  const handleRandomize = () => {
    const newId = generateRandomUniqueId();
    setUniqueId(newId);
    setDisplayName(newId);
    setError('');
    sound.playCoin();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = uniqueId.trim().replace(/[^a-zA-Z0-9_-]/g, '');
    if (cleanId.length < 3) {
      setError('Unique ID must be at least 3 characters long (letters, numbers, underscores).');
      sound.playHit();
      return;
    }
    const cleanName = displayName.trim() || cleanId;
    sound.playPowerUp();
    onConfirm(cleanId, cleanName);
  };

  return (
    <div
      id="login-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none select-none"
    >
      <div
        id="login-modal-container"
        className="pointer-events-auto relative w-full max-w-md bg-[#2b2b2b] text-white shadow-2xl overflow-hidden flex flex-col my-auto animate-fade-in"
        style={{
          transform: `translate(${dragOffset.x}px, ${dragOffset.y}px)`,
          border: '4px solid #555555',
          borderTopColor: '#888888',
          borderLeftColor: '#888888',
          borderBottomColor: '#1a1a1a',
          borderRightColor: '#1a1a1a',
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.75), inset 0 2px 0 rgba(255, 255, 255, 0.2)',
        }}
      >
        {/* Draggable Titlebar */}
        <div
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className="px-4 py-2.5 bg-[#4a2e18] border-b-4 border-[#2d1b0e] flex items-center justify-between cursor-move active:cursor-grabbing text-white"
        >
          <div className="flex items-center gap-2">
            <span className="text-base">⛏️</span>
            <span className="font-minecraft text-xs text-yellow-300 tracking-wider">
              MINER TAG CONFIGURATION
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setDragOffset({ x: 0, y: 0 })}
              className="p-1 bg-[#3a2010] hover:bg-[#5a3219] border border-[#78431f] rounded text-[10px] text-amber-200 cursor-pointer"
              title="Center window"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="p-1 bg-[#3a2010] hover:bg-rose-900 border border-[#78431f] rounded text-gray-300 hover:text-white cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4 bg-[#1f1f1f]">
          {/* Unique ID Input */}
          <div className="p-3 bg-[#262626] border border-[#444] rounded">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[10px] font-minecraft text-cyan-300">UNIQUE MINER ID (LEADERBOARD TAG)</label>
              <button
                type="button"
                onClick={handleRandomize}
                className="text-[10px] font-minecraft text-yellow-400 hover:text-yellow-300 flex items-center gap-1 cursor-pointer"
              >
                <Dice5 className="w-3 h-3" /> Randomize
              </button>
            </div>
            <div className="relative flex items-center">
              <span className="absolute left-3 text-cyan-400 font-minecraft text-xs">#</span>
              <input
                id="unique-id-input"
                type="text"
                value={uniqueId}
                onChange={(e) => {
                  setUniqueId(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ''));
                  setError('');
                }}
                maxLength={20}
                placeholder="Diamond_Steve_99"
                className="w-full pl-7 pr-3 py-2 bg-black border-2 border-[#555] focus:border-cyan-400 rounded text-cyan-200 font-minecraft text-xs focus:outline-none"
                autoFocus
              />
            </div>
          </div>

          {/* Display Name Input */}
          <div className="p-3 bg-[#262626] border border-[#444] rounded">
            <label className="block text-[10px] font-minecraft text-gray-300 mb-1.5">
              DISPLAY NAME (OPTIONAL)
            </label>
            <div className="relative flex items-center">
              <User className="w-3.5 h-3.5 text-gray-400 absolute left-3 pointer-events-none" />
              <input
                id="display-name-input"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                maxLength={20}
                placeholder={uniqueId || 'Steve'}
                className="w-full pl-8 pr-3 py-2 bg-black border-2 border-[#555] focus:border-cyan-400 rounded text-white font-minecraft text-xs focus:outline-none"
              />
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-2.5 bg-rose-900/40 border border-rose-500 rounded text-rose-300 text-xs font-minecraft flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Confirm & Start Button */}
          <button
            id="confirm-id-start-button"
            type="submit"
            className="mc-button mc-button-green w-full py-3 px-5 text-white font-minecraft text-sm flex items-center justify-center gap-2 cursor-pointer shadow-lg mt-1"
          >
            <Check className="w-4 h-4" />
            <span>SAVE & PLAY NOW ➔</span>
          </button>

          {/* Optional Google Login */}
          {onGoogleLogin && !googleUser && (
            <button
              id="google-signin-button"
              type="button"
              onClick={onGoogleLogin}
              className="mc-button w-full py-2 px-3 text-white font-minecraft text-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5 text-emerald-400" />
              <span>Sign in with Google</span>
            </button>
          )}

          {googleUser && (
            <div className="text-center text-[10px] text-emerald-400 font-minecraft bg-emerald-950/40 border border-emerald-500/40 p-2 rounded">
              ✓ Google Connected: {googleUser.displayName || googleUser.email}
            </div>
          )}
        </form>
      </div>
    </div>
  );
};
