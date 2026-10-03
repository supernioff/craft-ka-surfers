import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { PlayerState } from '../game/types.ts';
import { Trophy, RefreshCw, Home, ListOrdered } from 'lucide-react';

interface GameOverModalProps {
  playerState: PlayerState;
  isNewHighScore: boolean;
  personalBest?: number;
  onRespawn: () => void;
  onHome: () => void;
  onOpenLeaderboard: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  playerState,
  isNewHighScore,
  personalBest = 0,
  onRespawn,
  onHome,
  onOpenLeaderboard,
}) => {
  useEffect(() => {
    if (isNewHighScore) {
      confetti({
        particleCount: 60,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#ffd700', '#ff5722', '#4caf50', '#ffffff'],
      });
    }
  }, [isNewHighScore]);

  return (
    <div
      id="game-over-overlay"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4"
      style={{
        background: 'radial-gradient(ellipse at center, rgba(160, 20, 20, 0.75) 0%, rgba(10, 0, 0, 0.94) 85%)',
        backdropFilter: 'blur(3px)',
      }}
    >
      <div className="w-full max-w-md max-h-[92dvh] overflow-y-auto flex flex-col items-center text-center animate-fade-in my-auto p-1">
        {/* Iconic Minecraft Death Text */}
        <h1
          id="minecraft-you-died-title"
          className="font-minecraft text-4xl sm:text-5xl text-red-500 font-bold tracking-wider mb-2 select-none"
          style={{
            textShadow: '3px 3px 0px #380000, 0 0 20px rgba(255, 30, 30, 0.7)',
          }}
        >
          You Died!
        </h1>

        {/* Cause of death */}
        <p
          id="minecraft-cause-of-death"
          className="font-minecraft text-xs sm:text-sm text-gray-300 mb-6 max-w-xs leading-relaxed"
          style={{ textShadow: '1px 1px 0px #000' }}
        >
          {playerState.causeOfDeath || 'Player was slain by the Ghost Policeman'}
        </p>

        {/* High Score Banner */}
        {isNewHighScore ? (
          <div
            id="new-high-score-banner"
            className="mb-4 px-3 sm:px-4 py-2 bg-amber-500/20 border-2 border-amber-400 rounded-lg flex items-center justify-center gap-2 animate-bounce shadow-lg max-w-full"
          >
            <Trophy className="w-5 h-5 text-amber-400 shrink-0" />
            <span className="font-minecraft text-[11px] sm:text-xs text-amber-300 leading-snug">
              NEW HIGH SCORE POSTED TO LEADERBOARD! 🏆
            </span>
          </div>
        ) : (
          <div className="mb-4 px-3 py-1.5 bg-black/40 border border-yellow-500/30 rounded flex items-center justify-center gap-2 text-xs font-minecraft text-yellow-300 max-w-full overflow-hidden">
            <Trophy className="w-4 h-4 text-yellow-400 shrink-0" />
            <span className="truncate">
              Best High Score: {Math.max(playerState.score, personalBest).toLocaleString()} pts
            </span>
          </div>
        )}

        {/* Run Stats Container - Protected from overflow on all devices & screens */}
        <div
          id="game-over-stats-card"
          className="w-full bg-[#1b1e24]/90 border-2 border-[#474e5d] rounded-xl p-3 sm:p-4 mb-5 text-center shadow-2xl overflow-hidden"
        >
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5">
            {/* Score */}
            <div className="flex flex-col items-center justify-center p-2 sm:p-2.5 bg-black/40 rounded-lg border border-white/5 min-w-0 overflow-hidden">
              <span className="text-gray-400 text-[10px] block mb-0.5 font-mono uppercase font-semibold">Score</span>
              <span
                id="final-score-value"
                className={`font-minecraft text-yellow-400 truncate max-w-full tracking-tight ${
                  playerState.score > 999999 ? 'text-xs sm:text-sm' : playerState.score > 99999 ? 'text-sm sm:text-base' : 'text-base sm:text-lg'
                }`}
                title={playerState.score.toLocaleString()}
              >
                {playerState.score.toLocaleString()}
              </span>
            </div>

            {/* Distance */}
            <div className="flex flex-col items-center justify-center p-2 sm:p-2.5 bg-black/40 rounded-lg border border-emerald-500/20 min-w-0 overflow-hidden">
              <span className="text-emerald-400 text-[10px] block mb-0.5 font-mono uppercase font-semibold">Distance</span>
              <span
                className="font-minecraft text-sm sm:text-base md:text-lg text-emerald-400 truncate max-w-full"
                title={`${Math.floor(playerState.distance).toLocaleString()}m`}
              >
                {Math.floor(playerState.distance).toLocaleString()}m
              </span>
            </div>

            {/* Diamonds */}
            <div className="flex flex-col items-center justify-center p-2 sm:p-2.5 bg-black/40 rounded-lg border border-cyan-500/20 min-w-0 overflow-hidden">
              <span className="text-cyan-300 text-[10px] block mb-0.5 font-mono uppercase font-semibold">Diamonds</span>
              <span
                id="final-coins-value"
                className="font-minecraft text-sm sm:text-base md:text-lg text-cyan-300 flex items-center justify-center gap-1 truncate max-w-full"
                title={`${playerState.coins.toLocaleString()} Diamonds`}
              >
                <span className="shrink-0 text-xs sm:text-sm">💎</span>
                <span className="truncate">{playerState.coins.toLocaleString()}</span>
              </span>
            </div>

            {/* Near Miss */}
            <div className="flex flex-col items-center justify-center p-2 sm:p-2.5 bg-black/40 rounded-lg border border-orange-500/20 min-w-0 overflow-hidden">
              <span className="text-orange-400 text-[10px] block mb-0.5 font-mono uppercase font-semibold">Near Miss</span>
              <span
                className="font-minecraft text-sm sm:text-base md:text-lg text-orange-400 flex items-center justify-center gap-1 truncate max-w-full"
                title={`${playerState.nearMissCount || 0} Near Misses`}
              >
                <span className="shrink-0 text-xs sm:text-sm">⚡</span>
                <span className="truncate">{playerState.nearMissCount || 0}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons: Respawn positioned directly under the stats */}
        <div className="w-full flex flex-col gap-3">
          <button
            id="respawn-button"
            onClick={onRespawn}
            className="mc-button mc-button-green w-full py-4 px-6 text-white text-base sm:text-lg flex items-center justify-center gap-2.5 cursor-pointer shadow-lg tracking-wide"
          >
            <RefreshCw className="w-5 h-5" />
            Respawn
          </button>

          <div className="grid grid-cols-2 gap-3">
            <button
              id="leaderboard-button"
              onClick={onOpenLeaderboard}
              className="mc-button w-full py-2.5 px-3 text-white text-xs sm:text-sm flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <ListOrdered className="w-4 h-4 text-yellow-400" />
              High Scores
            </button>

            <button
              id="title-screen-button"
              onClick={onHome}
              className="mc-button w-full py-2.5 px-3 text-white text-xs sm:text-sm flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Home className="w-4 h-4" />
              Title Screen
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
