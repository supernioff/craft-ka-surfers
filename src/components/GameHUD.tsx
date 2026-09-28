import React, { useEffect, useRef, useState } from 'react';
import { PlayerState, RaceRoom, GameTheme } from '../game/types.ts';
import { GAME_THEMES, THEME_LIST } from '../game/themes.ts';
import { Volume2, VolumeX, Shield, Magnet, ArrowLeft, ArrowRight, ArrowUp, ArrowDown, Siren, Music, Disc3, Gauge, Map } from 'lucide-react';
import { sound } from '../sound/audio.ts';

interface GameHUDProps {
  playerState: PlayerState;
  isMuted?: boolean;
  isSfxMuted?: boolean;
  isBgmMuted?: boolean;
  onToggleMute?: () => void;
  onToggleSfx?: () => void;
  onToggleBgm?: () => void;
  onPause: () => void;
  onMoveLeft: () => void;
  onMoveRight: () => void;
  onJump: () => void;
  onSlide: () => void;
  multiplayerRoom?: RaceRoom | null;
  currentUserId?: string;
  introPhase?: string;
  introText?: string;
  onSkipIntro?: () => void;
  selectedTheme?: GameTheme;
  onSelectTheme?: (theme: GameTheme) => void;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  playerState,
  isMuted,
  isSfxMuted = sound.isSfxMuted(),
  isBgmMuted = sound.isBgmMuted(),
  onToggleMute,
  onToggleSfx,
  onToggleBgm,
  onPause,
  onMoveLeft,
  onMoveRight,
  onJump,
  onSlide,
  multiplayerRoom,
  currentUserId,
  introPhase,
  introText,
  onSkipIntro,
  selectedTheme = 'day_walk',
  onSelectTheme,
}) => {
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const activeSfxMuted = isSfxMuted ?? isMuted ?? false;
  const toggleSfxHandler = onToggleSfx || onToggleMute || (() => sound.toggleSfx());
  const toggleBgmHandler = onToggleBgm || (() => sound.toggleBgm());

  // Global Touch Swipe detection
  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        touchStartRef.current = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
        };
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!touchStartRef.current || e.changedTouches.length === 0) return;
      const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
      const dy = e.changedTouches[0].clientY - touchStartRef.current.y;
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);

      const minSwipeDistance = 25;

      if (Math.max(absDx, absDy) > minSwipeDistance) {
        if (absDx > absDy) {
          // Horizontal swipe
          if (dx > 0) {
            onMoveRight();
          } else {
            onMoveLeft();
          }
        } else {
          // Vertical swipe
          if (dy < 0) {
            onJump();
          } else {
            onSlide();
          }
        }
      }
      touchStartRef.current = null;
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [onMoveLeft, onMoveRight, onJump, onSlide]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        onMoveLeft();
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        onMoveRight();
      } else if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W' || e.key === ' ') {
        onJump();
      } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        onSlide();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onMoveLeft, onMoveRight, onJump, onSlide]);

  // Chaser proximity calculation
  const chaserDist = Math.max(0, playerState.chaserDistance);
  const isChaserDanger = chaserDist < 2.8;

  // Approximate velocity in km/h
  const approxSpeedKmh = Math.floor(65 + (playerState.distance / 120) * 3);

  // Multiplayer info
  const isMultiplayer = Boolean(multiplayerRoom && multiplayerRoom.status === 'racing');
  const isHost = currentUserId === multiplayerRoom?.hostId;
  const oppProgress = isHost ? multiplayerRoom?.guestProgress : multiplayerRoom?.hostProgress;
  const oppName = isHost ? (multiplayerRoom?.guestName || 'Friend') : (multiplayerRoom?.hostName || 'Host');
  const targetDistance = multiplayerRoom?.targetDistance || 1000;

  const playerPct = Math.min(100, (playerState.distance / targetDistance) * 100);
  const oppDistance = oppProgress?.distance || 0;
  const oppPct = Math.min(100, (oppDistance / targetDistance) * 100);
  const diffDistance = Math.floor(playerState.distance - oppDistance);

  return (
    <div id="game-hud-container" className="absolute inset-0 pointer-events-none flex flex-col justify-between p-3 sm:p-5 select-none overflow-hidden">
      {/* Danger Screen Border when Inspector Policeman is on Steve's heels */}
      {isChaserDanger && (
        <div className="absolute inset-0 pointer-events-none border-4 sm:border-8 border-red-500/70 shadow-[inset_0_0_40px_rgba(239,68,68,0.4)] animate-pulse transition-all duration-200" />
      )}

      {/* TOP BAR: Clean, High-Clarity HUD Badges */}
      <div className="flex flex-col gap-2 w-full max-w-5xl mx-auto z-10">
        <div className="flex items-center justify-between w-full gap-2">
          {/* Main Status Pod */}
          <div className="flex items-center gap-3 sm:gap-5 bg-slate-900/85 backdrop-blur-md px-4 py-2 rounded-xl border border-slate-700/60 shadow-lg pointer-events-auto">
            {/* Score */}
            <div>
              <span className="text-[9px] text-amber-400/90 uppercase tracking-widest font-mono font-semibold block">
                SCORE
              </span>
              <span id="hud-score" className="font-minecraft text-base sm:text-xl text-amber-400 font-bold drop-shadow">
                {playerState.score.toLocaleString()}
              </span>
            </div>

            <div className="h-6 w-[1px] bg-slate-700/60" />

            {/* Distance */}
            <div>
              <span className="text-[9px] text-emerald-400/90 uppercase tracking-widest font-mono font-semibold block">
                DISTANCE
              </span>
              <span id="hud-distance" className="font-minecraft text-sm sm:text-lg text-emerald-400 font-bold drop-shadow">
                {Math.floor(playerState.distance)}m
              </span>
            </div>

            <div className="h-6 w-[1px] bg-slate-700/60" />

            {/* Diamonds */}
            <div className="flex items-center gap-1.5" title="Minecraft Diamonds">
              <span className="text-sky-300 text-sm inline-block">💎</span>
              <span id="hud-coins" className="font-minecraft text-sm sm:text-base text-sky-300 font-bold drop-shadow">
                {playerState.coins}
              </span>
            </div>

            {/* Speedometer & Zone */}
            <div className="hidden md:flex items-center gap-2 pl-1 border-l border-slate-700/60">
              <Gauge className="w-3.5 h-3.5 text-slate-400" />
              <div className="flex flex-col">
                <span className="text-[8px] text-slate-400 font-mono">SPEED</span>
                <span className="font-mono text-xs text-slate-200 font-bold">{approxSpeedKmh} <span className="text-[9px] text-slate-400">KM/H</span></span>
              </div>
            </div>

            {/* Canyon Zone Badge */}
            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/40 border border-white/10 text-[10px] font-mono text-cyan-300">
              <span className="text-xs">
                {playerState.currentZone?.includes('Nether') ? '🔥' : playerState.currentZone?.includes('Crystal') ? '💎' : '☀️'}
              </span>
              <span>{playerState.currentZone || 'Overworld Ravine'}</span>
            </div>

            {/* Near Miss Combo Badge */}
            {playerState.comboStreak > 0 && (
              <span className="font-minecraft text-[10px] bg-gradient-to-r from-orange-500 to-amber-500 text-white font-extrabold px-2.5 py-1 rounded-lg shadow-lg animate-pulse flex items-center gap-1">
                <span>⚡</span>
                <span>{playerState.comboStreak}X NEAR MISS!</span>
              </span>
            )}

            {playerState.multiplier > 1 && (
              <span className="font-minecraft text-[10px] bg-amber-500 text-slate-950 font-extrabold px-2 py-0.5 rounded shadow animate-bounce">
                {playerState.multiplier}X MULTIPLIER
              </span>
            )}
          </div>

          {/* Right Pod: BGM Music Equalizer & Controls */}
          <div className="flex items-center gap-2 pointer-events-auto">
            {/* Live Music Equalizer Bar */}
            <div className="hidden sm:flex items-center gap-2 bg-slate-900/85 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-700/60 shadow">
              <Disc3 className={`w-3.5 h-3.5 text-amber-400 ${!isBgmMuted ? 'animate-spin' : ''}`} />
              <div className="flex flex-col">
                <span className="text-[8px] font-mono text-slate-300 tracking-wider">MUSIC</span>
                <div className="flex items-end gap-0.5 h-2">
                  <div className={`w-1 bg-amber-400 rounded-t ${!isBgmMuted ? 'h-2 animate-pulse' : 'h-0.5'}`}></div>
                  <div className={`w-1 bg-emerald-400 rounded-t ${!isBgmMuted ? 'h-1.5 animate-bounce' : 'h-0.5'}`}></div>
                  <div className={`w-1 bg-sky-400 rounded-t ${!isBgmMuted ? 'h-2 animate-pulse' : 'h-0.5'}`}></div>
                  <div className={`w-1 bg-amber-400 rounded-t ${!isBgmMuted ? 'h-1 animate-bounce' : 'h-0.5'}`}></div>
                </div>
              </div>
            </div>

            {/* Biome Theme Selector */}
            {onSelectTheme && (
              <div className="relative group">
                <button
                  type="button"
                  onClick={() => {
                    // Cycle next theme on click
                    const keys: GameTheme[] = ['day_walk', 'night_walk', 'closed_cave', 'water_walk'];
                    const nextIdx = ((selectedTheme ? keys.indexOf(selectedTheme) : 0) + 1) % keys.length;
                    onSelectTheme(keys[nextIdx]);
                    sound.playCoin();
                  }}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-900/85 backdrop-blur-md border border-slate-700/60 shadow text-xs font-minecraft text-amber-300 hover:text-white flex items-center gap-1.5 cursor-pointer transition-all"
                  title="Cycle Biome (Day Walk / Night Walk / Closed Cave / Water Walk)"
                >
                  <span>{selectedTheme ? GAME_THEMES[selectedTheme]?.icon : '☀️'}</span>
                  <span className="hidden md:inline text-[10px]">{selectedTheme ? GAME_THEMES[selectedTheme]?.name : 'Day Walk'}</span>
                </button>
              </div>
            )}

            {/* Dedicated Music Toggle */}
            <button
              id="hud-music-button"
              onClick={toggleBgmHandler}
              className={`p-2 sm:p-2.5 rounded-xl backdrop-blur-md border transition-all cursor-pointer flex items-center gap-1.5 ${
                isBgmMuted
                  ? 'bg-slate-900/70 border-slate-700/50 text-slate-500 hover:text-slate-300'
                  : 'bg-amber-600/35 border-amber-500/60 text-amber-300 shadow ring-1 ring-amber-400/40'
              }`}
              title={isBgmMuted ? 'Unmute Vibe Music' : 'Mute Vibe Music'}
            >
              <Music className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${!isBgmMuted ? 'animate-pulse text-amber-300' : 'text-slate-400'}`} />
              <span className="text-[10px] font-mono hidden min-[480px]:inline">
                {isBgmMuted ? 'BGM OFF' : 'BGM ON'}
              </span>
            </button>

            {/* Sound FX Toggle (Only mutes SFX, does not touch Music) */}
            <button
              id="hud-mute-button"
              onClick={toggleSfxHandler}
              className={`p-2 sm:p-2.5 rounded-xl backdrop-blur-md border transition-all cursor-pointer ${
                activeSfxMuted
                  ? 'bg-slate-900/70 border-slate-700/50 text-slate-500 hover:text-slate-300'
                  : 'bg-sky-600/30 border-sky-500/50 text-sky-300 shadow'
              }`}
              title={activeSfxMuted ? 'Unmute Sound FX' : 'Mute Sound FX'}
            >
              {activeSfxMuted ? (
                <VolumeX className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400" />
              ) : (
                <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-300" />
              )}
            </button>

            {/* Pause / Menu Button */}
            <button
              id="hud-pause-button"
              onClick={onPause}
              className="px-2.5 py-1.5 sm:py-2 bg-slate-900/80 hover:bg-slate-900 backdrop-blur-md rounded-xl border border-slate-700/60 text-slate-200 text-xs font-minecraft cursor-pointer transition-colors"
              title="Pause to Menu"
            >
              ⏸
            </button>
          </div>
        </div>

        {/* INTRO CINEMATIC BANNER */}
        {introPhase && introPhase !== 'done' && (
          <div className="mx-auto bg-slate-900/90 border border-amber-400/50 backdrop-blur-md px-5 py-2.5 rounded-xl shadow-lg flex items-center gap-3">
            <span className="font-minecraft text-xs sm:text-sm text-amber-300 tracking-wider">
              {introText || 'Mining diamond in the canyon...'}
            </span>
            {onSkipIntro && (
              <button
                onClick={onSkipIntro}
                className="text-[11px] font-minecraft bg-amber-500/20 hover:bg-amber-500/40 border border-amber-400 text-amber-200 px-2.5 py-1 rounded-lg cursor-pointer pointer-events-auto transition-all"
              >
                Start Run
              </button>
            )}
          </div>
        )}

        {/* MULTIPLAYER 1v1 RACE PROGRESS BAR */}
        {isMultiplayer && (
          <div
            id="multiplayer-race-progress-bar"
            className="w-full bg-slate-900/90 backdrop-blur-md border border-slate-700/60 rounded-xl p-2.5 shadow-lg pointer-events-auto"
          >
            <div className="flex items-center justify-between text-[11px] font-minecraft mb-1.5">
              <div className="flex items-center gap-1.5 text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                <span>YOU ({Math.floor(playerState.distance)}m)</span>
              </div>

              <div className="text-xs">
                {diffDistance >= 0 ? (
                  <span className="text-emerald-400">+{diffDistance}m Ahead</span>
                ) : (
                  <span className="text-rose-400">{diffDistance}m Behind</span>
                )}
              </div>

              <div className="text-sky-400">
                <span>{oppName} ({Math.floor(oppDistance)}m)</span>
              </div>
            </div>

            {/* Dual Track Bar */}
            <div className="relative w-full h-3 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
              {/* You bar */}
              <div
                className="absolute top-0 left-0 h-full bg-emerald-500 rounded-full transition-all duration-150"
                style={{ width: `${playerPct}%` }}
              />
              {/* Opponent marker */}
              <div
                className="absolute top-0 bottom-0 w-3 bg-amber-400 border border-white rounded-full transition-all duration-150 transform -translate-x-1/2"
                style={{ left: `${oppPct}%` }}
                title={`${oppName}: ${Math.floor(oppDistance)}m`}
              />
            </div>
          </div>
        )}

        {/* GHOST POLICEMAN THREAT METER */}
        {chaserDist <= 7.0 && (
          <div className="flex items-center justify-between max-w-xs transition-opacity duration-300">
            <div
              id="chaser-threat-gauge"
              className={`flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl border backdrop-blur-md transition-all duration-200 ${
                isChaserDanger
                  ? 'bg-red-950/90 border-red-500 text-red-200 shadow-lg animate-bounce'
                  : 'bg-slate-900/85 border-slate-700/60 text-slate-300'
              }`}
            >
              <Siren className={`w-4 h-4 ${isChaserDanger ? 'text-red-400 animate-spin' : 'text-sky-400'}`} />
              <div className="flex flex-col">
                <span className="text-[9px] uppercase font-mono font-semibold tracking-wider text-red-300">
                  Ghost Inspector
                </span>
                <span className="font-minecraft text-xs">
                  {isChaserDanger ? 'CLOSE BEHIND! RUN!' : `${chaserDist.toFixed(1)}m behind`}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* POWER-UP ACTIVE BARS */}
        <div className="flex flex-col gap-1.5 max-w-xs">
          {playerState.invincibleTimer > 0 && (
            <div className="flex items-center gap-2 bg-amber-500/20 border border-amber-400/50 rounded-xl px-3 py-1.5 backdrop-blur-md shadow">
              <Shield className="w-4 h-4 text-amber-400 animate-pulse" />
              <span className="font-minecraft text-[10px] text-amber-300">ENCHANTED GOLDEN APPLE: {Math.ceil(playerState.invincibleTimer)}s</span>
              <div className="flex-1 h-1.5 bg-black/50 rounded-full overflow-hidden ml-2">
                <div
                  className="h-full bg-amber-400 transition-all duration-100"
                  style={{ width: `${(playerState.invincibleTimer / 8) * 100}%` }}
                />
              </div>
            </div>
          )}

          {playerState.magnetTimer > 0 && (
            <div className="flex items-center gap-2 bg-sky-500/20 border border-sky-400/50 rounded-xl px-3 py-1.5 backdrop-blur-md shadow">
              <Magnet className="w-4 h-4 text-sky-400 animate-pulse" />
              <span className="font-minecraft text-[10px] text-sky-300">REDSTONE MAGNET: {Math.ceil(playerState.magnetTimer)}s</span>
              <div className="flex-1 h-1.5 bg-black/50 rounded-full overflow-hidden ml-2">
                <div
                  className="h-full bg-sky-400 transition-all duration-100"
                  style={{ width: `${(playerState.magnetTimer / 10) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* BOTTOM CONTROLS: Clean Ergonomic Mobile Touch Controls with Safe-Area support */}
      <div
        className="w-full flex items-end justify-between pointer-events-auto z-10 touch-none select-none max-w-5xl mx-auto"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 0.5rem)' }}
      >
        {/* Left / Right Lane switch touch pads */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            id="mobile-touch-left"
            onClick={onMoveLeft}
            className="w-13 h-13 min-[380px]:w-15 min-[380px]:h-15 sm:w-16 sm:h-16 bg-slate-900/85 hover:bg-slate-900 active:scale-90 active:bg-cyan-900/60 border-2 border-slate-600 active:border-cyan-400 rounded-2xl flex items-center justify-center text-slate-200 active:text-cyan-300 shadow-xl transition-transform cursor-pointer backdrop-blur-md touch-none"
            aria-label="Move Left"
          >
            <ArrowLeft className="w-6 h-6 sm:w-7 sm:h-7" />
          </button>

          <button
            id="mobile-touch-right"
            onClick={onMoveRight}
            className="w-13 h-13 min-[380px]:w-15 min-[380px]:h-15 sm:w-16 sm:h-16 bg-slate-900/85 hover:bg-slate-900 active:scale-90 active:bg-cyan-900/60 border-2 border-slate-600 active:border-cyan-400 rounded-2xl flex items-center justify-center text-slate-200 active:text-cyan-300 shadow-xl transition-transform cursor-pointer backdrop-blur-md touch-none"
            aria-label="Move Right"
          >
            <ArrowRight className="w-6 h-6 sm:w-7 sm:h-7" />
          </button>
        </div>

        {/* Keyboard instructions for desktop / large screens */}
        <div className="hidden md:flex items-center gap-2 text-slate-300 text-xs font-mono bg-slate-900/85 backdrop-blur-md px-4 py-2 rounded-full border border-slate-700/70 shadow">
          <span>← → Lanes • ↑ / Space Jump • ↓ Slide / Duck</span>
        </div>

        {/* Jump / Slide touch pads */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            id="mobile-touch-slide"
            onClick={onSlide}
            className="w-13 h-13 min-[380px]:w-15 min-[380px]:h-15 sm:w-16 sm:h-16 bg-slate-900/85 hover:bg-slate-900 active:scale-90 active:bg-amber-900/60 border-2 border-amber-600/70 active:border-amber-400 rounded-2xl flex flex-col items-center justify-center text-amber-300 shadow-xl transition-transform cursor-pointer backdrop-blur-md touch-none"
            aria-label="Slide / Duck"
          >
            <ArrowDown className="w-5 h-5 sm:w-6 sm:h-6" />
            <span className="text-[8px] sm:text-[9px] font-minecraft mt-0.5">SLIDE</span>
          </button>

          <button
            id="mobile-touch-jump"
            onClick={onJump}
            className="w-13 h-13 min-[380px]:w-15 min-[380px]:h-15 sm:w-16 sm:h-16 bg-slate-900/85 hover:bg-slate-900 active:scale-90 active:bg-emerald-900/60 border-2 border-emerald-600/70 active:border-emerald-400 rounded-2xl flex flex-col items-center justify-center text-emerald-300 shadow-xl transition-transform cursor-pointer backdrop-blur-md touch-none"
            aria-label="Jump"
          >
            <ArrowUp className="w-5 h-5 sm:w-6 sm:h-6" />
            <span className="text-[8px] sm:text-[9px] font-minecraft mt-0.5">JUMP</span>
          </button>
        </div>
      </div>
    </div>
  );
};
