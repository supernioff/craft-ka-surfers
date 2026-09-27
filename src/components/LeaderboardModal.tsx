import React, { useEffect, useState } from 'react';
import { db, handleFirestoreError, OperationType } from '../firebase/config.ts';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { HighScoreRecord } from '../game/types.ts';
import { Trophy, X, Medal, Crown } from 'lucide-react';

interface LeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserId?: string;
  personalBest?: number;
  displayName?: string;
}

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({
  isOpen,
  onClose,
  currentUserId,
  personalBest = 0,
  displayName = 'Steve',
}) => {
  const [scores, setScores] = useState<HighScoreRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);

    const path = 'highScores';
    try {
      const q = query(collection(db, path), orderBy('score', 'desc'), limit(50));
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const userBestMap = new Map<string, HighScoreRecord>();

          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const uid = data.userId || docSnap.id;
            const score = data.score || 0;
            const existing = userBestMap.get(uid);

            if (!existing || score > existing.score) {
              userBestMap.set(uid, {
                id: docSnap.id,
                userId: uid,
                displayName: data.displayName || 'Steve',
                score,
                distance: data.distance || 0,
                coins: data.coins || 0,
                createdAt: data.createdAt || '',
              });
            }
          });

          // Ensure active player's personal best is included
          if (currentUserId && personalBest > 0) {
            const currentEntry = userBestMap.get(currentUserId);
            if (!currentEntry) {
              userBestMap.set(currentUserId, {
                id: `local_${currentUserId}`,
                userId: currentUserId,
                displayName: displayName || currentUserId,
                score: personalBest,
                distance: 0,
                coins: 0,
                createdAt: new Date().toISOString(),
              });
            } else if (personalBest > currentEntry.score) {
              currentEntry.score = personalBest;
            }
          }

          const list = Array.from(userBestMap.values()).sort((a, b) => b.score - a.score);
          setScores(list);
          setLoading(false);
        },
        (error) => {
          console.warn('Firestore fetch warning:', error);
          // Fallback to local personal best if offline or initial load
          if (currentUserId && personalBest > 0) {
            setScores([
              {
                id: `local_${currentUserId}`,
                userId: currentUserId,
                displayName: displayName || currentUserId,
                score: personalBest,
                distance: 0,
                coins: 0,
                createdAt: new Date().toISOString(),
              },
            ]);
          }
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (err) {
      console.warn('Leaderboard fetch error:', err);
      if (currentUserId && personalBest > 0) {
        setScores([
          {
            id: `local_${currentUserId}`,
            userId: currentUserId,
            displayName: displayName || currentUserId,
            score: personalBest,
            distance: 0,
            coins: 0,
            createdAt: new Date().toISOString(),
          },
        ]);
      }
      setLoading(false);
    }
  }, [isOpen, currentUserId, personalBest, displayName]);

  if (!isOpen) return null;

  return (
    <div
      id="leaderboard-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
    >
      <div
        id="leaderboard-modal-container"
        className="w-full max-w-lg bg-[#1a1e24] border-2 border-[#474e5d] rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-[#14171c]">
          <div className="flex items-center gap-2.5">
            <Trophy className="w-5 h-5 text-yellow-400" />
            <h2 className="font-minecraft text-sm sm:text-base text-white tracking-wide">
              Global Leaderboard
            </h2>
          </div>

          <button
            id="close-leaderboard-button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Player High Score Bar */}
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-5 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-minecraft text-amber-300">YOUR HIGH SCORE:</span>
            <span className="text-xs font-mono px-1.5 py-0.5 bg-black/40 border border-amber-500/30 text-amber-200 rounded">
              ID: {currentUserId || 'Miner'}
            </span>
          </div>
          <span className="font-minecraft text-sm text-yellow-400 font-bold">
            {personalBest.toLocaleString()} <span className="text-xs text-yellow-500/80 font-sans">pts</span>
          </span>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 divide-y divide-white/5">
          {loading ? (
            <div className="py-12 text-center">
              <div className="w-8 h-8 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="font-minecraft text-xs text-gray-400">Loading runner rankings...</p>
            </div>
          ) : scores.length === 0 ? (
            <div className="py-12 text-center text-gray-400">
              <Trophy className="w-10 h-10 text-gray-600 mx-auto mb-2" />
              <p className="font-minecraft text-xs">No high scores recorded yet!</p>
              <p className="text-xs text-gray-500 mt-1">Be the first runner to etch your name in stone.</p>
            </div>
          ) : (
            scores.map((record, index) => {
              const isCurrentUser = currentUserId && record.userId === currentUserId;
              const rank = index + 1;

              return (
                <div
                  key={record.id || index}
                  className={`flex items-center justify-between py-3 px-3 rounded-lg transition-colors ${
                    isCurrentUser ? 'bg-amber-500/10 border border-amber-400/30' : 'hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {/* Rank Badge */}
                    <div className="w-7 h-7 flex items-center justify-center font-minecraft text-xs">
                      {rank === 1 ? (
                        <Crown className="w-5 h-5 text-yellow-400" />
                      ) : rank === 2 ? (
                        <Medal className="w-5 h-5 text-gray-300" />
                      ) : rank === 3 ? (
                        <Medal className="w-5 h-5 text-amber-600" />
                      ) : (
                        <span className="text-gray-400">{rank}</span>
                      )}
                    </div>

                    {/* Player Name & Unique ID */}
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className={`font-minecraft text-xs ${isCurrentUser ? 'text-amber-300 font-bold' : 'text-white'}`}>
                          {record.displayName}
                        </span>
                        {isCurrentUser && (
                          <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1 rounded font-minecraft">YOU</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] font-mono bg-cyan-500/15 text-cyan-300 px-1.5 py-0.2 rounded border border-cyan-500/30">
                          ID: {record.userId}
                        </span>
                        <span className="text-[11px] text-gray-400 font-sans">
                          • {record.coins} Diamonds 💎
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Score */}
                  <div className="text-right">
                    <span className="font-minecraft text-sm sm:text-base text-yellow-400 block">
                      {record.score.toLocaleString()}
                    </span>
                    <span className="text-[10px] text-gray-500 font-sans">pts</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-white/10 bg-[#14171c] text-center">
          <p className="text-xs text-gray-400 font-sans">
            Play Single Player to submit new records to Firestore.
          </p>
        </div>
      </div>
    </div>
  );
};
