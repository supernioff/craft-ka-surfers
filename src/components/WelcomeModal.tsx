import React, { useState, useRef, useCallback } from 'react';
import {
  Volume2,
  VolumeX,
  Music,
  Dice5,
  LogIn,
  Check,
  Edit2,
  Move,
  RotateCcw,
  Users,
  Trophy,
  X,
} from 'lucide-react';
import { RunnerSkin, GuestProfile, GameTheme } from '../game/types.ts';
import { THEME_LIST } from '../game/themes.ts';
import { sound } from '../sound/audio.ts';

interface WelcomeModalProps {
  isOpen: boolean;
  onPlayAsGuest: (uniqueId: string, displayName: string, skin: RunnerSkin) => void;
  onOpenMultiplayer: () => void;
  onOpenLeaderboard: () => void;
  onGoogleLogin?: () => void;
  googleUser?: any;
  currentId: string;
  currentName: string;
  selectedSkin: RunnerSkin;
  onSelectSkin: (skin: RunnerSkin) => void;
  selectedTheme: GameTheme;
  onSelectTheme: (theme: GameTheme) => void;
  profile: GuestProfile;
  isMuted: boolean;
  isBgmMuted: boolean;
  onToggleMute: () => void;
  onToggleBgm: () => void;
  onClose?: () => void;
}

const SKINS: {
  id: RunnerSkin;
  name: string;
  badge: string;
  themeColor: string;
  borderColor: string;
  icon: string;
}[] = [
  {
    id: 'steve',
    name: 'Classic Steve',
    badge: 'DEFAULT',
    themeColor: 'text-cyan-400',
    borderColor: 'border-cyan-500/60',
    icon: '⛏️',
  },
  {
    id: 'diamond',
    name: 'Diamond Knight',
    badge: 'ENCHANTED',
    themeColor: 'text-sky-300',
    borderColor: 'border-sky-400/60',
    icon: '💎',
  },
  {
    id: 'nether',
    name: 'Nether Runner',
    badge: 'INFERNAL',
    themeColor: 'text-orange-400',
    borderColor: 'border-orange-500/60',
    icon: '🔥',
  },
  {
    id: 'gold',
    name: 'Golden Voyager',
    badge: 'MYTHIC',
    themeColor: 'text-amber-300',
    borderColor: 'border-amber-400/60',
    icon: '👑',
  },
];

const RANDOM_TAGS = [
  'VoxelGhost', 'NetherStriker', 'RedstoneAce', 'CanyonSurfer',
  'DiamondDigger', 'CaveProwler', 'SonicSteve', 'ObsidianRider',
  'MinecartPro', 'PhantomHunter', 'EmeraldRush', 'GoldProspector'
];

export const WelcomeModal: React.FC<WelcomeModalProps> = ({
  isOpen,
  onPlayAsGuest,
  onOpenMultiplayer,
  onOpenLeaderboard,
  onGoogleLogin,
  googleUser,
  currentId,
  currentName,
  selectedSkin,
  onSelectSkin,
  selectedTheme,
  onSelectTheme,
  profile,
  isMuted,
  isBgmMuted,
  onToggleMute,
  onToggleBgm,
  onClose,
}) => {
  // Navigation tabs: 'themes' | 'skins' | 'guest'
  const [activeTab, setActiveTab] = useState<'themes' | 'skins' | 'guest'>('themes');

  // Movable Window coordinates
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ mouseX: 0, mouseY: 0, initialX: 0, initialY: 0 });

  // Guest gamer tag & display name state
  const [guestTag, setGuestTag] = useState(() => currentId || `Runner_${Math.floor(1000 + Math.random() * 9000)}`);
  const [displayName, setDisplayName] = useState(() => currentName || guestTag);
  const [isEditingTag, setIsEditingTag] = useState(false);

  // Drag Handlers
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
    const rawX = dragStartRef.current.initialX + dx;
    const rawY = dragStartRef.current.initialY + dy;
    const maxX = Math.max(20, (window.innerWidth - 300) / 2);
    const maxY = Math.max(20, (window.innerHeight - 200) / 2);
    setDragOffset({
      x: Math.max(-maxX, Math.min(maxX, rawX)),
      y: Math.max(-maxY, Math.min(maxY, rawY)),
    });
  }, []);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    isDraggingRef.current = false;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
  }, []);

  const handleResetPosition = () => {
    setDragOffset({ x: 0, y: 0 });
    sound.playSlide();
  };

  const handleRandomizeTag = () => {
    const prefix = RANDOM_TAGS[Math.floor(Math.random() * RANDOM_TAGS.length)];
    const num = Math.floor(100 + Math.random() * 900);
    const newTag = `${prefix}_${num}`;
    setGuestTag(newTag);
    setDisplayName(newTag);
    sound.playCoin();
  };

  const handleSaveChanges = () => {
    sound.playPowerUp();
    onPlayAsGuest(guestTag, displayName, selectedSkin);
    if (onClose) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      id="welcome-window-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 pointer-events-none select-none"
    >
      {/* Movable Window Container */}
      <div
        id="movable-minecraft-window"
        className="pointer-events-auto relative w-full max-w-lg max-h-[88dvh] bg-[#222222] text-white shadow-2xl overflow-y-auto flex flex-col my-auto rounded"
        style={{
          transform: `translate(${dragOffset.x}px, ${dragOffset.y}px)`,
          border: '4px solid #555555',
          borderTopColor: '#777777',
          borderLeftColor: '#777777',
          borderBottomColor: '#111111',
          borderRightColor: '#111111',
          boxShadow: '0 12px 48px rgba(0, 0, 0, 0.85), inset 0 2px 0 rgba(255, 255, 255, 0.15)',
        }}
      >
        {/* DRAGGABLE MINECRAFT TITLEBAR WITH CLOSE CROSS (X) */}
        <div
          id="minecraft-window-titlebar"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className="relative px-3.5 py-2 bg-[#3f2514] border-b-4 border-[#24150b] flex items-center justify-between cursor-move active:cursor-grabbing text-white"
        >
          <div className="flex items-center gap-2">
            <span className="text-base">⛏️</span>
            <div className="flex flex-col">
              <span className="font-minecraft text-xs text-yellow-300 tracking-wider">
                CRAFT KA SURFERS
              </span>
              <span className="text-[9px] font-mono text-amber-200/70 flex items-center gap-1">
                <Move className="w-2.5 h-2.5" />
                <span>Drag to reposition</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleResetPosition}
              className="px-2 py-0.5 bg-[#311c0f] hover:bg-[#4d2c18] border border-[#6b3c1b] rounded text-[9px] font-minecraft text-amber-200 cursor-pointer"
              title="Reset position"
            >
              <RotateCcw className="w-2.5 h-2.5 inline mr-1" />
              <span>Center</span>
            </button>

            <button
              type="button"
              onClick={onToggleBgm}
              className={`p-1 border rounded cursor-pointer ${
                isBgmMuted
                  ? 'bg-[#311c0f] border-[#444] text-gray-400'
                  : 'bg-amber-600/40 border-amber-400 text-yellow-300'
              }`}
              title="Toggle Music"
            >
              <Music className="w-3 h-3" />
            </button>

            <button
              type="button"
              onClick={onToggleMute}
              className={`p-1 border rounded cursor-pointer ${
                isMuted
                  ? 'bg-[#311c0f] border-[#444] text-gray-400'
                  : 'bg-cyan-600/40 border-cyan-400 text-cyan-300'
              }`}
              title="Toggle SFX"
            >
              {isMuted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
            </button>

            {/* Window Close Cross (X) */}
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="p-1 bg-[#311c0f] hover:bg-[#6b2020] border border-[#6b3c1b] hover:border-red-400 rounded text-gray-300 hover:text-white cursor-pointer transition-colors"
                title="Close Window"
              >
                <X className="w-3.5 h-3.5 text-red-300" />
              </button>
            )}
          </div>
        </div>

        {/* 3D MINECRAFT LOGO BANNER (CENTERED) */}
        <div className="relative pt-4 pb-3 px-4 bg-gradient-to-b from-[#181d28] to-[#161616] text-center border-b-2 border-[#333]">
          <div className="mc-flying-logo relative flex flex-col items-center justify-center">
            <div className="flex flex-col items-center gap-1">
              <div className="flex items-center justify-center tracking-widest text-xl sm:text-2xl font-minecraft font-bold select-none">
                <span className="mc-block-letter text-gray-200">C</span>
                <span className="mc-block-letter text-gray-200">R</span>
                <span className="mc-block-letter text-gray-200">A</span>
                <span className="mc-block-letter text-gray-200">F</span>
                <span className="mc-block-letter text-gray-200">T</span>
                <span className="mx-2 text-cyan-400 font-minecraft text-base sm:text-lg">KA</span>
              </div>
              <div className="flex items-center justify-center tracking-widest text-xl sm:text-2xl font-minecraft font-bold select-none">
                <span className="mc-block-letter text-amber-400">S</span>
                <span className="mc-block-letter text-amber-400">U</span>
                <span className="mc-block-letter text-amber-400">R</span>
                <span className="mc-block-letter text-amber-400">F</span>
                <span className="mc-block-letter text-amber-400">E</span>
                <span className="mc-block-letter text-amber-400">R</span>
                <span className="mc-block-letter text-amber-400">S</span>
              </div>
            </div>

            {/* Clean Centered Slogan */}
            <div className="text-yellow-300 font-minecraft text-[10px] sm:text-xs font-bold mt-2.5 text-center drop-shadow">
              ★ SURF THE INFINITE VOXEL CANYON ★
            </div>
          </div>
        </div>

        {/* TAB CONTROLS */}
        <div className="flex items-center border-b border-[#333] bg-[#1a1a1a] px-3 pt-2 gap-1.5">
          <button
            type="button"
            onClick={() => {
              setActiveTab('themes');
              sound.playCoin();
            }}
            className={`px-3 py-1.5 text-[11px] font-minecraft rounded-t border-t border-x cursor-pointer transition-colors ${
              activeTab === 'themes'
                ? 'bg-[#2b2b2b] border-[#555] text-amber-300 font-bold'
                : 'bg-[#181818] border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            🗺️ BIOMES ({THEME_LIST.length})
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('skins');
              sound.playCoin();
            }}
            className={`px-3 py-1.5 text-[11px] font-minecraft rounded-t border-t border-x cursor-pointer transition-colors ${
              activeTab === 'skins'
                ? 'bg-[#2b2b2b] border-[#555] text-cyan-300 font-bold'
                : 'bg-[#181818] border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            🎨 SUITS ({SKINS.length})
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('guest');
              sound.playCoin();
            }}
            className={`px-3 py-1.5 text-[11px] font-minecraft rounded-t border-t border-x cursor-pointer transition-colors ${
              activeTab === 'guest'
                ? 'bg-[#2b2b2b] border-[#555] text-emerald-300 font-bold'
                : 'bg-[#181818] border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            👤 GAMER TAG
          </button>
        </div>

        {/* TAB CONTENT AREA */}
        <div className="p-4 bg-[#222222] flex flex-col gap-3">
          {/* TAB 1: BIOME THEMES SELECTOR */}
          {activeTab === 'themes' && (
            <div className="grid grid-cols-2 gap-2">
              {THEME_LIST.map((th) => {
                const isSelected = selectedTheme === th.id;
                return (
                  <button
                    key={th.id}
                    type="button"
                    onClick={() => {
                      onSelectTheme(th.id);
                      sound.playPowerUp();
                    }}
                    className={`p-2.5 rounded text-left border-2 cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-[#333333] border-yellow-400 ring-1 ring-yellow-400/50 shadow-md'
                        : 'bg-[#1c1c1c] border-[#3e3e3e] hover:border-[#666] opacity-80 hover:opacity-100'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-lg">{th.icon}</span>
                      <span className={`text-[9px] font-minecraft px-1.5 py-0.5 rounded bg-black/60 ${th.themeColor}`}>
                        {th.badge}
                      </span>
                    </div>
                    <div className="font-minecraft text-xs text-white font-bold">{th.name}</div>
                    <div className="text-[10px] text-gray-300 line-clamp-1 mt-0.5 font-sans">
                      {th.subtitle}
                    </div>
                    {isSelected && (
                      <div className="mt-1.5 text-[9px] font-minecraft text-emerald-400">
                        ✓ SELECTED BIOME
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* TAB 2: RUNNER SKINS */}
          {activeTab === 'skins' && (
            <div className="grid grid-cols-2 gap-2">
              {SKINS.map((s) => {
                const isSelected = selectedSkin === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      onSelectSkin(s.id);
                      sound.playPowerUp();
                    }}
                    className={`p-2.5 rounded text-left border-2 cursor-pointer transition-all flex items-center gap-2.5 ${
                      isSelected
                        ? 'bg-[#333333] border-cyan-400 ring-1 ring-cyan-400/50'
                        : 'bg-[#1c1c1c] border-[#3e3e3e] hover:border-[#666] opacity-80 hover:opacity-100'
                    }`}
                  >
                    <div className="w-9 h-9 rounded bg-black/60 border border-[#555] flex items-center justify-center text-lg shrink-0">
                      {s.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`font-minecraft text-xs truncate ${s.themeColor}`}>{s.name}</div>
                      <div className="text-[9px] text-gray-400 font-mono">{s.badge}</div>
                      {isSelected && (
                        <div className="text-[9px] font-minecraft text-emerald-400 mt-0.5">✓ EQUIPPED</div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* TAB 3: GAMER TAG & CLOUD SIGN IN */}
          {activeTab === 'guest' && (
            <div className="flex flex-col gap-2.5">
              <div className="p-3 bg-[#1c1c1c] border border-[#3e3e3e] rounded">
                <div className="text-[9px] font-minecraft text-gray-400 uppercase mb-1">
                  LEADERBOARD MINER TAG
                </div>

                {isEditingTag ? (
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={guestTag}
                      onChange={(e) => setGuestTag(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ''))}
                      maxLength={18}
                      className="flex-1 px-2.5 py-1 bg-black border border-cyan-400 rounded text-cyan-300 font-minecraft text-xs focus:outline-none"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditingTag(false);
                        setDisplayName(guestTag);
                        sound.playCoin();
                      }}
                      className="mc-button mc-button-green py-1 px-2.5 text-[10px] text-white"
                    >
                      Save
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <span className="font-minecraft text-sm text-yellow-300 tracking-wider truncate">
                      #{guestTag}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setIsEditingTag(true)}
                        className="px-2 py-0.5 bg-[#333] hover:bg-[#444] border border-[#555] rounded text-[10px] font-minecraft text-gray-200 cursor-pointer"
                      >
                        <Edit2 className="w-2.5 h-2.5 inline mr-1" />
                        <span>Edit</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleRandomizeTag}
                        className="px-2 py-0.5 bg-[#333] hover:bg-[#444] border border-[#555] rounded text-[10px] font-minecraft text-yellow-300 cursor-pointer"
                      >
                        <Dice5 className="w-2.5 h-2.5 inline mr-1" />
                        <span>Dice</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Google Login Option */}
              <div className="p-2.5 bg-[#181818] border border-[#333] rounded flex items-center justify-between">
                {googleUser ? (
                  <div className="flex items-center gap-2 text-[10px] font-minecraft text-emerald-400">
                    <Check className="w-3.5 h-3.5" />
                    <span className="truncate">Cloud Synced: {googleUser.displayName || googleUser.email}</span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={onGoogleLogin}
                    className="mc-button w-full py-1.5 px-3 text-white font-minecraft text-[10px] flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <LogIn className="w-3 h-3 text-emerald-400" />
                    <span>Sign In with Google Cloud</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* QUICK CAREER STATS BAR */}
          <div className="p-2 bg-[#171717] border border-[#333] rounded flex items-center justify-between text-[10px] font-minecraft">
            <span className="text-gray-400 flex items-center gap-1">
              <Trophy className="w-3 h-3 text-yellow-400" />
              <span>RECORD:</span>
            </span>
            <div className="flex items-center gap-3">
              <span className="text-yellow-400">{(profile.personalBest || 0).toLocaleString()} PTS</span>
              <span className="text-cyan-300">💎 {(profile.lifetimeCoins || 0).toLocaleString()}</span>
            </div>
          </div>

          {/* SAVE CHANGES BUTTON & MULTIPLAYER LOBBY */}
          <div className="flex gap-2 mt-0.5">
            <button
              id="welcome-save-changes-button"
              type="button"
              onClick={handleSaveChanges}
              className="mc-button mc-button-green flex-1 py-3 px-4 text-white font-minecraft text-sm flex items-center justify-center gap-2 cursor-pointer shadow-lg"
            >
              <Check className="w-4 h-4" />
              <span>SAVE CHANGES</span>
            </button>

            <button
              type="button"
              onClick={() => {
                sound.playCoin();
                onOpenMultiplayer();
              }}
              className="mc-button py-3 px-3 text-sky-200 font-minecraft text-xs flex items-center justify-center gap-1 cursor-pointer"
              title="1v1 Multiplayer Race"
            >
              <Users className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">1v1 RACE</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
