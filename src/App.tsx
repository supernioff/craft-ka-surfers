/**
 * 3D Minecraft Endless Runner (Subway Surfers Style)
 * Built with Three.js, Web Audio API, and Firebase Firestore
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { Engine3D } from './game/Engine3D.ts';
import { PlayerState, RaceRoom, HighScoreRecord, RunnerSkin, GuestProfile, GameTheme } from './game/types.ts';
import { GAME_THEMES, THEME_LIST } from './game/themes.ts';
import { GameHUD } from './components/GameHUD.tsx';
import { GameOverModal } from './components/GameOverModal.tsx';
import { LeaderboardModal } from './components/LeaderboardModal.tsx';
import { MultiplayerModal } from './components/MultiplayerModal.tsx';
import { LoginModal } from './components/LoginModal.tsx';
import { WelcomeModal } from './components/WelcomeModal.tsx';
import { CinematicIntro } from './components/CinematicIntro.tsx';
import {
  auth,
  db,
  googleProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User,
  handleFirestoreError,
  OperationType,
} from './firebase/config.ts';
import {
  collection,
  addDoc,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
} from 'firebase/firestore';
import { sound } from './sound/audio.ts';
import {
  Play,
  Users,
  Trophy,
  LogIn,
  LogOut,
  Volume2,
  VolumeX,
  Sparkles,
  Swords,
  Crown,
  Music,
  Disc3,
  Zap,
  Settings,
} from 'lucide-react';
import confetti from 'canvas-confetti';

export default function App() {
  // Container for Three.js
  const canvasRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<Engine3D | null>(null);

  // Auth & Unique Miner ID State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isGuest, setIsGuest] = useState(true);
  const [uniqueMinerId, setUniqueMinerId] = useState<string>(() => {
    return localStorage.getItem('mc_unique_miner_id') || `Runner_${Math.floor(1000 + Math.random() * 9000)}`;
  });
  const [minerDisplayName, setMinerDisplayName] = useState<string>(() => {
    return localStorage.getItem('mc_miner_name') || 'Runner';
  });
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);
  const [isWelcomeModalOpen, setIsWelcomeModalOpen] = useState<boolean>(false);
  const [showCinematicIntro, setShowCinematicIntro] = useState<boolean>(true);

  // Selected Runner Skin
  const [selectedSkin, setSelectedSkin] = useState<RunnerSkin>(() => {
    return (localStorage.getItem('craft_selected_skin') as RunnerSkin) || 'steve';
  });

  // Selected Environment Biome Theme (day_walk, night_walk, closed_cave, water_walk)
  const [selectedTheme, setSelectedTheme] = useState<GameTheme>(() => {
    return (localStorage.getItem('craft_selected_theme') as GameTheme) || 'day_walk';
  });

  // Persistent Guest Profile ("Remember for all")
  const [guestProfile, setGuestProfile] = useState<GuestProfile>(() => {
    try {
      const saved = localStorage.getItem('craft_guest_profile');
      if (saved) return JSON.parse(saved);
    } catch {}
    const best = parseInt(localStorage.getItem('mc_runner_best') || '0', 10);
    const coins = parseInt(localStorage.getItem('craft_lifetime_coins') || '0', 10);
    const dist = parseInt(localStorage.getItem('craft_lifetime_dist') || '0', 10);
    const runs = parseInt(localStorage.getItem('craft_total_runs') || '0', 10);
    return {
      uniqueId: localStorage.getItem('mc_unique_miner_id') || `Runner_${Math.floor(1000 + Math.random() * 9000)}`,
      displayName: localStorage.getItem('mc_miner_name') || 'Runner',
      selectedSkin: (localStorage.getItem('craft_selected_skin') as RunnerSkin) || 'steve',
      lifetimeCoins: coins,
      lifetimeDistance: dist,
      totalRuns: runs,
      personalBest: best,
      bestCombo: 0,
      completedMissions: [],
    };
  });

  // Intro Sequence Cinematic State
  const [introPhase, setIntroPhase] = useState<string>('mining');
  const [introText, setIntroText] = useState<string>('Mining deeply into the abandoned cave...');

  // App / Game Screen State
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'gameover'>('menu');
  const [gameMode, setGameMode] = useState<'single' | 'multiplayer'>('single');
  const [playerHUDState, setPlayerHUDState] = useState<PlayerState | null>(null);
  const [isNewHighScore, setIsNewHighScore] = useState(false);
  const [personalBest, setPersonalBest] = useState<number>(() => {
    return parseInt(localStorage.getItem('mc_runner_best') || '0', 10);
  });

  // Sound & Mute State (Independent SFX and BGM controls)
  const [isSfxMuted, setIsSfxMuted] = useState<boolean>(() => sound.isSfxMuted());
  const [isBgmMuted, setIsBgmMuted] = useState<boolean>(() => sound.isBgmMuted());

  // Modals
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const [isMultiplayerModalOpen, setIsMultiplayerModalOpen] = useState(false);

  // Multiplayer State
  const [activeRoom, setActiveRoom] = useState<RaceRoom | null>(null);
  const [isHost, setIsHost] = useState<boolean>(true);
  const [raceWinnerName, setRaceWinnerName] = useState<string | null>(null);
  const [isRaceFinished, setIsRaceFinished] = useState(false);

  // Throttle ref for multiplayer network updates
  const lastNetworkSyncTime = useRef(0);

  // Listen to Firebase Auth
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
        setIsGuest(false);
        // If user signs in with Google and hasn't set custom Miner ID, adopt their name
        if (!uniqueMinerId && user.displayName) {
          const autoId = user.displayName.replace(/[^a-zA-Z0-9_-]/g, '_');
          setUniqueMinerId(autoId);
          setMinerDisplayName(user.displayName);
          localStorage.setItem('mc_unique_miner_id', autoId);
          localStorage.setItem('mc_miner_name', user.displayName);
        }
      } else {
        setCurrentUser(null);
        setIsGuest(true);
      }
    });
    return () => unsubscribe();
  }, [uniqueMinerId]);

  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      sound.playPowerUp();
    } catch (error) {
      console.error('Login error:', error);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      sound.playSlide();
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  // Sync High Score & Diamonds to Firestore Leaderboard
  const syncHighScoreToLeaderboard = useCallback(async (
    scoreToSync: number,
    distanceRun: number = 0,
    diamondsEarned: number = 0,
    targetId?: string,
    targetName?: string
  ) => {
    const activeId = targetId || uniqueMinerId || (currentUser ? currentUser.uid : `Miner_${Date.now().toString().slice(-4)}`);
    const activeName = targetName || minerDisplayName || uniqueMinerId || currentUser?.displayName || 'Steve';

    if (!activeId) return;

    try {
      const scoreDocRef = doc(db, 'highScores', activeId);
      const existingSnap = await getDoc(scoreDocRef);
      const savedCoins = parseInt(localStorage.getItem('craft_lifetime_coins') || '0', 10);
      const currentLifetimeCoins = Math.max(diamondsEarned, savedCoins, guestProfile.lifetimeCoins || 0);

      const existingData = existingSnap.exists() ? existingSnap.data() : null;
      const prevScore = existingData?.score || 0;
      const prevCoins = Math.max(
        Number(existingData?.coins) || 0,
        Number(existingData?.diamonds) || 0,
        Number(existingData?.lifetimeCoins) || 0
      );

      const finalCoins = Math.max(currentLifetimeCoins, prevCoins);
      const finalScore = Math.max(scoreToSync, prevScore);

      if (finalScore > 0 || finalCoins > 0) {
        if (!existingSnap.exists() || prevScore <= scoreToSync || finalCoins > prevCoins) {
          const payload: HighScoreRecord = {
            userId: activeId,
            displayName: activeName,
            score: finalScore,
            distance: Math.max(distanceRun, existingData?.distance || 0),
            coins: finalCoins,
            createdAt: new Date().toISOString(),
          };
          await setDoc(scoreDocRef, payload, { merge: true });
        }
      }
    } catch (err) {
      console.warn('Could not sync high score to leaderboard:', err);
    }
  }, [uniqueMinerId, minerDisplayName, currentUser, guestProfile.lifetimeCoins]);

  const handleLoginConfirm = (id: string, name: string) => {
    setUniqueMinerId(id);
    setMinerDisplayName(name);
    localStorage.setItem('mc_unique_miner_id', id);
    localStorage.setItem('mc_miner_name', name);
    setIsLoginModalOpen(false);

    // Sync high score & diamonds to leaderboard immediately for this unique ID
    const savedCoins = parseInt(localStorage.getItem('craft_lifetime_coins') || '0', 10);
    const activeCoins = Math.max(savedCoins, guestProfile.lifetimeCoins || 0);
    if (personalBest > 0 || activeCoins > 0) {
      syncHighScoreToLeaderboard(personalBest, 0, activeCoins, id, name);
    }
  };

  // Sync high score & diamonds on initial boot if personalBest or diamonds exist
  useEffect(() => {
    const savedCoins = parseInt(localStorage.getItem('craft_lifetime_coins') || '0', 10);
    const activeCoins = Math.max(savedCoins, guestProfile.lifetimeCoins || 0);
    if ((personalBest > 0 || activeCoins > 0) && uniqueMinerId) {
      syncHighScoreToLeaderboard(personalBest, 0, activeCoins, uniqueMinerId, minerDisplayName);
    }
  }, [uniqueMinerId, minerDisplayName, personalBest, guestProfile.lifetimeCoins, syncHighScoreToLeaderboard]);

  // Keep refs for game state to avoid stale closures in engine callbacks
  const gameStateRef = useRef(gameState);
  gameStateRef.current = gameState;

  // Independent Sound & Music toggles
  const handleToggleSfx = () => {
    const nextState = sound.toggleSfx();
    setIsSfxMuted(nextState);
  };

  const handleToggleBgm = () => {
    const nextState = sound.toggleBgm();
    setIsBgmMuted(nextState);
  };

  // Sync music mode with menu vs running state
  useEffect(() => {
    sound.setMenuMode(gameState === 'menu' || gameState === 'gameover');
    if (!isBgmMuted) {
      sound.ensureBGM();
    }
  }, [gameState, isBgmMuted]);

  // Unlock Web Audio context and start chill vibe BGM on first user touch/click anywhere
  useEffect(() => {
    const handleFirstInteraction = () => {
      sound.initCtx();
      sound.setMenuMode(gameStateRef.current === 'menu' || gameStateRef.current === 'gameover');
      if (!sound.isBgmMuted()) {
        sound.ensureBGM();
      }
      window.removeEventListener('pointerdown', handleFirstInteraction);
      window.removeEventListener('keydown', handleFirstInteraction);
      window.removeEventListener('touchstart', handleFirstInteraction);
    };

    window.addEventListener('pointerdown', handleFirstInteraction, { passive: true });
    window.addEventListener('keydown', handleFirstInteraction, { passive: true });
    window.addEventListener('touchstart', handleFirstInteraction, { passive: true });

    return () => {
      window.removeEventListener('pointerdown', handleFirstInteraction);
      window.removeEventListener('keydown', handleFirstInteraction);
      window.removeEventListener('touchstart', handleFirstInteraction);
    };
  }, []);

  // Handle Game Over
  const handleGameOver = useCallback(async (finalState: PlayerState) => {
    if (gameStateRef.current !== 'playing') return;
    setGameState('gameover');
    // Keep vibey music flowing in chill background mode during death screen!
    sound.setMenuMode(true);

    const currentScore = finalState.score;
    const isNewBest = currentScore > personalBest;
    const bestScore = Math.max(currentScore, personalBest);

    if (isNewBest) {
      setPersonalBest(currentScore);
      localStorage.setItem('mc_runner_best', currentScore.toString());
      setIsNewHighScore(true);
    } else {
      setIsNewHighScore(false);
    }

    // Update Persistent Guest Profile
    setGuestProfile((prev) => {
      const updated: GuestProfile = {
        ...prev,
        lifetimeCoins: (prev.lifetimeCoins || 0) + finalState.coins,
        lifetimeDistance: (prev.lifetimeDistance || 0) + Math.floor(finalState.distance),
        totalRuns: (prev.totalRuns || 0) + 1,
        personalBest: Math.max(prev.personalBest || 0, finalState.score),
        bestCombo: Math.max(prev.bestCombo || 0, finalState.comboStreak || 0),
      };
      try {
        localStorage.setItem('craft_guest_profile', JSON.stringify(updated));
        localStorage.setItem('craft_lifetime_coins', updated.lifetimeCoins.toString());
        localStorage.setItem('craft_lifetime_dist', updated.lifetimeDistance.toString());
        localStorage.setItem('craft_total_runs', updated.totalRuns.toString());
      } catch {}
      return updated;
    });

    // Always put High Score & Accumulated Diamonds to Global Leaderboard
    const accumulatedDiamonds = (guestProfile.lifetimeCoins || 0) + finalState.coins;
    if (bestScore > 0 || accumulatedDiamonds > 0) {
      await syncHighScoreToLeaderboard(
        bestScore,
        Math.floor(finalState.distance),
        accumulatedDiamonds
      );
    }

    // If in multiplayer, notify room of death
    if (activeRoom) {
      try {
        const roomRef = doc(db, 'rooms', activeRoom.id);
        const updateField = isHost ? 'hostProgress' : 'guestProgress';
        await updateDoc(roomRef, {
          [`${updateField}.isDead`]: true,
          [`${updateField}.distance`]: Math.floor(finalState.distance),
          [`${updateField}.score`]: finalState.score,
          updatedAt: new Date().toISOString(),
        });
      } catch (err) {
        console.warn('Error updating multiplayer death:', err);
      }
    }
  }, [personalBest, currentUser, uniqueMinerId, minerDisplayName, activeRoom, isHost]);

  const handleGameOverRef = useRef(handleGameOver);
  handleGameOverRef.current = handleGameOver;

  // Start Engine on demand or reset
  const startGame = useCallback((mode: 'single' | 'multiplayer', seed: number = Date.now()) => {
    setGameMode(mode);
    setGameState('playing');
    setIsNewHighScore(false);
    setIsRaceFinished(false);
    setRaceWinnerName(null);

    sound.setMenuMode(false);
    sound.startBGM();

    if (engineRef.current) {
      engineRef.current.reset(seed);
    }
  }, []);

  const handleSelectSkin = useCallback((skin: RunnerSkin) => {
    setSelectedSkin(skin);
    try {
      localStorage.setItem('craft_selected_skin', skin);
    } catch {}
    setGuestProfile((prev) => ({ ...prev, selectedSkin: skin }));
    if (engineRef.current) {
      engineRef.current.setSkin(skin);
    }
  }, []);

  const handleSelectTheme = useCallback((theme: GameTheme) => {
    setSelectedTheme(theme);
    try {
      localStorage.setItem('craft_selected_theme', theme);
    } catch {}
    if (engineRef.current) {
      engineRef.current.setTheme(theme);
    }
  }, []);

  const handlePlayAsGuest = useCallback((id: string, name: string, skin: RunnerSkin) => {
    setUniqueMinerId(id);
    setMinerDisplayName(name);
    try {
      localStorage.setItem('mc_unique_miner_id', id);
      localStorage.setItem('mc_miner_name', name);
    } catch {}
    handleSelectSkin(skin);
    setIsWelcomeModalOpen(false);
  }, [handleSelectSkin]);

  // Initialize 3D Engine on mount once
  useEffect(() => {
    if (canvasRef.current && !engineRef.current) {
      const engine = new Engine3D(canvasRef.current, 1337);
      engineRef.current = engine;

      engine.setOnStateUpdate((st) => {
        setPlayerHUDState(st);
      });

      engine.setOnGameOver((st) => {
        handleGameOverRef.current(st);
      });

      engine.setOnIntroChange((phase, text) => {
        setIntroPhase(phase);
        setIntroText(text);
      });

      if (selectedSkin) {
        engine.setSkin(selectedSkin);
      }

      if (selectedTheme) {
        engine.setTheme(selectedTheme);
      }
    }

    return () => {
      engineRef.current?.destroy();
      engineRef.current = null;
    };
  }, []); // Run only once on mount: never destroy engine mid-run!

  // Dynamically update skin without re-instantiating the engine
  useEffect(() => {
    if (engineRef.current && selectedSkin) {
      engineRef.current.setSkin(selectedSkin);
    }
  }, [selectedSkin]);

  // Dynamically update theme without re-instantiating or freezing the engine
  useEffect(() => {
    if (engineRef.current && selectedTheme) {
      engineRef.current.setTheme(selectedTheme);
    }
  }, [selectedTheme]);

  // Handle Multiplayer Progress Sync
  useEffect(() => {
    if (!playerHUDState || gameState !== 'playing' || !activeRoom) return;

    const now = Date.now();
    // Throttle network sync to every 200ms
    if (now - lastNetworkSyncTime.current > 200) {
      lastNetworkSyncTime.current = now;

      const roomRef = doc(db, 'rooms', activeRoom.id);
      const updateField = isHost ? 'hostProgress' : 'guestProgress';

      const updateData: Record<string, any> = {
        [`${updateField}.distance`]: Math.floor(playerHUDState.distance),
        [`${updateField}.score`]: playerHUDState.score,
        [`${updateField}.lane`]: playerHUDState.lane,
        [`${updateField}.isDead`]: playerHUDState.isDead,
        [`${updateField}.updatedAt`]: now,
      };

      // Check win condition (1000m target)
      if (playerHUDState.distance >= activeRoom.targetDistance && !isRaceFinished) {
        updateData.status = 'finished';
        updateData.winnerId = currentUser?.uid || (isHost ? activeRoom.hostId : activeRoom.guestId);
      }

      updateDoc(roomRef, updateData).catch((err) => {
        console.warn('Room sync error:', err);
      });
    }
  }, [playerHUDState, gameState, activeRoom, isHost, isRaceFinished, currentUser]);

  // Listen to active multiplayer room updates
  useEffect(() => {
    if (!activeRoom) return;

    const roomRef = doc(db, 'rooms', activeRoom.id);
    const unsubscribe = onSnapshot(
      roomRef,
      (docSnap) => {
        if (!docSnap.exists()) return;
        const data = docSnap.data() as RaceRoom;
        setActiveRoom(data);

        // Update opponent avatar in 3D scene
        if (engineRef.current) {
          const oppProg = isHost ? data.guestProgress : data.hostProgress;
          if (oppProg) {
            engineRef.current.updateOpponent(oppProg.distance, oppProg.lane, oppProg.isDead);
          }
        }

        // Check if race has finished
        if (data.status === 'finished' && !isRaceFinished) {
          setIsRaceFinished(true);
          const winnerIsYou = (data.winnerId === currentUser?.uid) || (isHost && data.winnerId === data.hostId);
          const winnerName = winnerIsYou ? 'You' : (isHost ? data.guestName : data.hostName);
          setRaceWinnerName(winnerName || 'Winner');

          if (winnerIsYou) {
            confetti({
              particleCount: 100,
              spread: 80,
              origin: { y: 0.5 },
            });
          }
        }

        // Opponent died while you are running
        const oppProg = isHost ? data.guestProgress : data.hostProgress;
        if (oppProg?.isDead && !playerHUDState?.isDead && !isRaceFinished) {
          setIsRaceFinished(true);
          setRaceWinnerName('You (Opponent Wrecked!)');
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.5 },
          });
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, `rooms/${activeRoom.id}`);
      }
    );

    return () => unsubscribe();
  }, [activeRoom?.id, isHost, currentUser, isRaceFinished, playerHUDState?.isDead]);

  // Handle Multiplayer Start from Modal
  const handleStartMultiplayerRace = (room: RaceRoom, asHost: boolean) => {
    setActiveRoom(room);
    setIsHost(asHost);
    startGame('multiplayer', room.seed);
  };

  // Controls bindings
  const handleMoveLeft = () => engineRef.current?.moveLeft();
  const handleMoveRight = () => engineRef.current?.moveRight();
  const handleJump = () => engineRef.current?.jump();
  const handleSlide = () => engineRef.current?.slide();

  return (
    <div id="minecraft-runner-app" className="relative w-full h-[100dvh] min-h-[100dvh] overflow-hidden bg-[#0a0e14] select-none touch-manipulation">
      {/* 3D Canvas WebGL Viewport */}
      <div
        id="webgl-3d-canvas"
        ref={canvasRef}
        className="w-full h-full absolute inset-0 z-0 cursor-pointer touch-none"
      />

      {/* TITLE / MENU SCREEN */}
      {gameState === 'menu' && (
        <div
          id="title-screen-overlay"
          className="absolute inset-0 z-20 flex flex-col items-center justify-between p-2.5 sm:p-4 overflow-y-auto"
          style={{
            background: 'radial-gradient(ellipse at center, rgba(10, 14, 20, 0.45) 0%, rgba(5, 7, 10, 0.92) 100%)',
            paddingTop: 'max(env(safe-area-inset-top, 0px), 0.5rem)',
            paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 0.5rem)',
          }}
        >
          {/* Top Navigation Bar: Google Sign In, Miner ID & Sound */}
          <div className="w-full max-w-4xl flex flex-wrap items-center justify-between gap-2 z-10">
            {/* User Profile & Unique Miner ID Badges */}
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <button
                id="open-welcome-modal-btn"
                onClick={() => setIsWelcomeModalOpen(true)}
                className="flex items-center gap-1.5 bg-emerald-600/30 hover:bg-emerald-600/50 backdrop-blur-md px-2.5 sm:px-3 py-1.5 rounded-lg border border-emerald-500/50 shadow-lg text-emerald-300 cursor-pointer transition-all text-xs font-minecraft"
                title="Open Guest Welcome Hub & Skins"
              >
                <span>⚡</span>
                <span className="hidden min-[360px]:inline">GUEST HUB</span>
              </button>

              <button
                id="edit-miner-id-btn"
                onClick={() => setIsLoginModalOpen(true)}
                className="flex items-center gap-1.5 bg-black/60 hover:bg-black/80 backdrop-blur-md px-2.5 sm:px-3 py-1.5 rounded-lg border border-cyan-500/40 shadow-lg text-cyan-300 cursor-pointer transition-all"
                title="Click to change your unique Miner ID"
              >
                <span>💎</span>
                <span className="font-minecraft text-xs max-w-[110px] sm:max-w-[140px] truncate">#{uniqueMinerId || 'Choose_ID'}</span>
                <span className="text-[9px] bg-cyan-500/20 text-cyan-300 px-1 py-0.5 rounded font-sans hidden min-[400px]:inline">
                  EDIT
                </span>
              </button>

              <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-2.5 sm:px-3 py-1.5 rounded-lg border border-white/10 shadow-lg">
                {currentUser ? (
                  <>
                    {currentUser.photoURL ? (
                      <img
                        src={currentUser.photoURL}
                        alt={currentUser.displayName || 'User'}
                        className="w-4 h-4 sm:w-5 sm:h-5 rounded-full border border-yellow-400"
                      />
                    ) : (
                      <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-emerald-600 flex items-center justify-center text-[10px] text-white font-bold">
                        {currentUser.displayName?.[0] || 'U'}
                      </div>
                    )}
                    <span className="font-minecraft text-xs text-yellow-300 max-w-[80px] sm:max-w-[120px] truncate">
                      {currentUser.displayName || 'Steve'}
                    </span>
                    <button
                      id="sign-out-btn"
                      onClick={handleSignOut}
                      className="ml-1 text-gray-400 hover:text-white p-0.5 cursor-pointer"
                      title="Sign Out"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                    </button>
                  </>
                ) : (
                  <button
                    id="google-login-btn"
                    onClick={handleGoogleLogin}
                    className="flex items-center gap-1 text-xs text-white hover:text-yellow-300 transition-colors cursor-pointer font-minecraft"
                  >
                    <LogIn className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="hidden min-[420px]:inline">Google Login</span>
                    <span className="min-[420px]:hidden">Sign In</span>
                  </button>
                )}
              </div>
            </div>

            {/* Audio & Music Controls (Separated SFX and Music) */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                id="replay-intro-button"
                type="button"
                onClick={() => setShowCinematicIntro(true)}
                className="p-2 sm:p-2.5 bg-slate-900/80 hover:bg-slate-900 backdrop-blur-md rounded-xl border border-amber-500/50 text-amber-300 cursor-pointer transition-colors flex items-center gap-1"
                title="Replay Cinematic Intro"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span className="text-[10px] font-minecraft hidden min-[480px]:inline">INTRO</span>
              </button>

              <button
                id="menu-music-button"
                onClick={handleToggleBgm}
                className={`p-2 sm:p-2.5 backdrop-blur-md rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 ${
                  isBgmMuted
                    ? 'bg-slate-900/70 border-slate-700/50 text-slate-500 hover:text-slate-300'
                    : 'bg-amber-600/35 border-amber-500/60 text-amber-300 shadow ring-1 ring-amber-400/40'
                }`}
                title={isBgmMuted ? 'Unmute Vibe Music' : 'Mute Vibe Music'}
              >
                <Music className={`w-4 h-4 ${!isBgmMuted ? 'animate-pulse text-amber-300' : 'text-slate-400'}`} />
                <span className="text-[10px] font-mono hidden min-[480px]:inline">
                  {isBgmMuted ? 'MUSIC OFF' : 'VIBE MUSIC ON'}
                </span>
              </button>

              <button
                id="menu-mute-button"
                onClick={handleToggleSfx}
                className={`p-2 sm:p-2.5 backdrop-blur-md rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 ${
                  isSfxMuted
                    ? 'bg-slate-900/70 border-slate-700/50 text-slate-500 hover:text-slate-300'
                    : 'bg-cyan-600/30 border-cyan-500/50 text-cyan-300 shadow'
                }`}
                title={isSfxMuted ? 'Unmute Sound Effects' : 'Mute Sound Effects'}
              >
                {isSfxMuted ? (
                  <VolumeX className="w-4 h-4 text-slate-400" />
                ) : (
                  <Volume2 className="w-4 h-4 text-cyan-300" />
                )}
                <span className="text-[10px] font-mono hidden min-[480px]:inline">{isSfxMuted ? 'SFX OFF' : 'SFX ON'}</span>
              </button>
            </div>
          </div>

          {/* Centered Main Game Branding & Action Buttons */}
          <div className="flex flex-col items-center text-center max-w-md w-full my-auto animate-fade-in z-10 px-2 py-2">
            {/* 3D Flying Minecraft Logo */}
            <div className="mb-2 sm:mb-3">
              <div className="mc-flying-logo relative flex flex-col items-center">
                <div className="flex flex-col items-center gap-1">
                  <div className="flex items-center justify-center tracking-widest text-xl min-[360px]:text-2xl sm:text-3xl font-minecraft font-bold select-none">
                    <span className="mc-block-letter text-gray-200">C</span>
                    <span className="mc-block-letter text-gray-200">R</span>
                    <span className="mc-block-letter text-gray-200">A</span>
                    <span className="mc-block-letter text-gray-200">F</span>
                    <span className="mc-block-letter text-gray-200">T</span>
                    <span className="mx-1.5 sm:mx-2 text-cyan-400 font-minecraft text-base min-[360px]:text-lg sm:text-xl">KA</span>
                  </div>
                  <div className="flex items-center justify-center tracking-widest text-xl min-[360px]:text-2xl sm:text-3xl font-minecraft font-bold select-none">
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
                <div className="text-yellow-300 font-minecraft text-[9px] min-[360px]:text-[10px] sm:text-xs font-bold mt-1.5 sm:mt-2 text-center drop-shadow">
                  ★ SURF THE INFINITE VOXEL CANYON ★
                </div>
              </div>
            </div>

            {/* Biome Quick Selector */}
            <div className="w-full bg-black/60 backdrop-blur-md p-1.5 sm:p-2 rounded-xl border border-white/10 mb-2 sm:mb-3">
              <div className="text-[8px] sm:text-[9px] font-minecraft text-gray-400 mb-1 uppercase tracking-wider">
                CHOOSE BIOME THEME
              </div>
              <div className="grid grid-cols-4 gap-1">
                {THEME_LIST.map((th) => {
                  const isSel = selectedTheme === th.id;
                  return (
                    <button
                      key={th.id}
                      type="button"
                      onClick={() => handleSelectTheme(th.id)}
                      className={`p-1 sm:p-1.5 rounded text-center border transition-all cursor-pointer ${
                        isSel
                          ? 'bg-amber-600/40 border-amber-400 text-yellow-300 ring-1 ring-amber-400'
                          : 'bg-black/40 border-[#444] text-gray-400 hover:text-white'
                      }`}
                    >
                      <span className="text-sm sm:text-base block">{th.icon}</span>
                      <span className="text-[8px] sm:text-[9px] font-minecraft block truncate">{th.name.split(' ')[0]}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Personal Best banner */}
            {personalBest > 0 && (
              <div
                id="menu-personal-best-chip"
                className="mb-2 sm:mb-3 px-3 py-1 bg-slate-900/85 border border-amber-500/40 rounded-xl flex items-center gap-2 shadow backdrop-blur-md"
              >
                <Crown className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400 animate-pulse" />
                <span className="font-minecraft text-[10px] sm:text-xs text-amber-300">
                  Best: {personalBest.toLocaleString()} pts
                </span>
              </div>
            )}

            {/* Primary Action Buttons */}
            <div className="w-full flex flex-col gap-1.5 sm:gap-2">
              {/* Single Player Mode */}
              <button
                id="start-singleplayer-btn"
                onClick={() => startGame('single')}
                className="mc-button mc-button-green w-full py-3 sm:py-3.5 px-4 sm:px-6 font-minecraft text-xs sm:text-base text-white flex items-center justify-center gap-2 sm:gap-3 cursor-pointer shadow-lg active:scale-98"
              >
                <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-current text-white" />
                <span>START RUN ➔</span>
              </button>

              {/* Open Draggable Customizer Window */}
              <button
                id="open-customize-btn"
                onClick={() => {
                  sound.playCoin();
                  setIsWelcomeModalOpen(true);
                }}
                className="mc-button w-full py-2 sm:py-2.5 px-3 sm:px-5 font-minecraft text-[10px] sm:text-xs text-emerald-300 flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer"
              >
                <Settings className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400" />
                <span>CUSTOMIZE RUNNER & BIOMES ⚙️</span>
              </button>

              {/* Online Multiplayer Mode */}
              <button
                id="open-multiplayer-btn"
                onClick={() => setIsMultiplayerModalOpen(true)}
                className="mc-button w-full py-2 sm:py-2.5 px-3 sm:px-5 font-minecraft text-[10px] sm:text-xs text-sky-300 flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer"
              >
                <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-sky-300" />
                <span>MULTIPLAYER RACE (1v1 CODE)</span>
              </button>

              {/* Global Leaderboard */}
              <button
                id="open-leaderboard-btn"
                onClick={() => setIsLeaderboardOpen(true)}
                className="mc-button w-full py-2 sm:py-2.5 px-3 sm:px-5 font-minecraft text-[10px] sm:text-xs text-amber-300 flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer"
              >
                <Trophy className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" />
                <span>GLOBAL LEADERBOARD</span>
              </button>
            </div>
          </div>

          {/* Footer Controls Guide */}
          <div className="w-full max-w-md bg-slate-900/85 backdrop-blur-md rounded-xl border border-slate-700/60 p-2 sm:p-2.5 text-center z-10 shadow">
            <div className="grid grid-cols-2 gap-1.5 sm:gap-2 text-[9px] sm:text-[10px] text-slate-300 font-mono">
              <div className="flex items-center justify-center gap-1 sm:gap-1.5">
                <span className="bg-slate-800 border border-slate-600 px-1.5 py-0.5 rounded text-[8px] sm:text-[9px]">← →</span>
                <span>Switch Lanes</span>
              </div>
              <div className="flex items-center justify-center gap-1 sm:gap-1.5">
                <span className="bg-slate-800 border border-slate-600 px-1.5 py-0.5 rounded text-[8px] sm:text-[9px]">↑ / Space</span>
                <span>Jump</span>
              </div>
              <div className="flex items-center justify-center gap-1 sm:gap-1.5">
                <span className="bg-slate-800 border border-slate-600 px-1.5 py-0.5 rounded text-[8px] sm:text-[9px]">↓</span>
                <span>Slide / Duck</span>
              </div>
              <div className="flex items-center justify-center gap-1 sm:gap-1.5 text-emerald-400">
                <Sparkles className="w-3 h-3" />
                <span>Touch / Swipe Ready</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ACTIVE GAMEPLAY HUD OVERLAY */}
      {gameState === 'playing' && playerHUDState && (
        <GameHUD
          playerState={playerHUDState}
          isMuted={isSfxMuted}
          isSfxMuted={isSfxMuted}
          isBgmMuted={isBgmMuted}
          onToggleMute={handleToggleSfx}
          onToggleSfx={handleToggleSfx}
          onToggleBgm={handleToggleBgm}
          onPause={() => {
            setGameState('menu');
            sound.setMenuMode(true);
            sound.ensureBGM();
            engineRef.current?.pauseToMenu();
          }}
          onMoveLeft={handleMoveLeft}
          onMoveRight={handleMoveRight}
          onJump={handleJump}
          onSlide={handleSlide}
          multiplayerRoom={activeRoom}
          currentUserId={uniqueMinerId || currentUser?.uid}
          introPhase={introPhase}
          introText={introText}
          onSkipIntro={() => engineRef.current?.skipIntro()}
          selectedTheme={selectedTheme}
          onSelectTheme={handleSelectTheme}
        />
      )}

      {/* MULTIPLAYER FINISHED WINNER NOTIFICATION */}
      {isRaceFinished && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fade-in">
          <div className="max-w-sm w-full bg-[#1e232a] border-2 border-yellow-400 rounded-xl p-6 text-center shadow-2xl">
            <Swords className="w-12 h-12 text-yellow-400 mx-auto mb-3" />
            <h2 className="font-minecraft text-xl text-yellow-300 mb-2">Race Finished!</h2>
            <p className="text-gray-300 font-sans text-sm mb-4">
              Winner: <span className="font-minecraft text-emerald-400 font-bold">{raceWinnerName}</span>
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => {
                  if (activeRoom) {
                    startGame('multiplayer', activeRoom.seed + 1);
                  }
                }}
                className="mc-button mc-button-green w-full py-3 text-white text-xs cursor-pointer"
              >
                Rematch (New Track)
              </button>
              <button
                onClick={() => {
                  setActiveRoom(null);
                  setGameState('menu');
                  engineRef.current?.pauseToMenu();
                }}
                className="mc-button w-full py-2.5 text-white text-xs cursor-pointer"
              >
                Exit to Title
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MINECRAFT CLASSIC "YOU DIED" GAME OVER MODAL */}
      {gameState === 'gameover' && playerHUDState && (
        <GameOverModal
          playerState={playerHUDState}
          isNewHighScore={isNewHighScore}
          personalBest={personalBest}
          onRespawn={() => startGame(gameMode)}
          onHome={() => {
            setGameState('menu');
            setActiveRoom(null);
            sound.setMenuMode(true);
            sound.ensureBGM();
            engineRef.current?.pauseToMenu();
          }}
          onOpenLeaderboard={() => setIsLeaderboardOpen(true)}
        />
      )}

      {/* GRAPHIC DESIGNER MODERN GUEST WELCOME WINDOW */}
      <WelcomeModal
        isOpen={isWelcomeModalOpen && gameState === 'menu'}
        onPlayAsGuest={handlePlayAsGuest}
        onOpenMultiplayer={() => {
          setIsWelcomeModalOpen(false);
          setIsMultiplayerModalOpen(true);
        }}
        onOpenLeaderboard={() => {
          setIsWelcomeModalOpen(false);
          setIsLeaderboardOpen(true);
        }}
        onGoogleLogin={handleGoogleLogin}
        googleUser={currentUser}
        currentId={uniqueMinerId}
        currentName={minerDisplayName}
        selectedSkin={selectedSkin}
        onSelectSkin={handleSelectSkin}
        selectedTheme={selectedTheme}
        onSelectTheme={handleSelectTheme}
        profile={guestProfile}
        isMuted={isSfxMuted}
        isBgmMuted={isBgmMuted}
        onToggleMute={handleToggleSfx}
        onToggleBgm={handleToggleBgm}
        onClose={() => setIsWelcomeModalOpen(false)}
      />

      {/* LEADERBOARD MODAL */}
      <LeaderboardModal
        isOpen={isLeaderboardOpen}
        onClose={() => setIsLeaderboardOpen(false)}
        currentUserId={uniqueMinerId || currentUser?.uid}
        personalBest={personalBest}
        displayName={minerDisplayName || uniqueMinerId || currentUser?.displayName || 'Steve'}
        diamonds={Math.max(guestProfile.lifetimeCoins || 0, parseInt(localStorage.getItem('craft_lifetime_coins') || '0', 10))}
      />

      {/* MULTIPLAYER RACE LOBBY MODAL */}
      <MultiplayerModal
        isOpen={isMultiplayerModalOpen}
        onClose={() => setIsMultiplayerModalOpen(false)}
        userId={uniqueMinerId || currentUser?.uid || `guest_${Date.now()}`}
        userName={minerDisplayName || uniqueMinerId || currentUser?.displayName || 'Steve'}
        onStartRace={handleStartMultiplayerRace}
      />

      {/* LOGIN & UNIQUE MINER ID REGISTRATION MODAL */}
      <LoginModal
        isOpen={isLoginModalOpen}
        currentId={uniqueMinerId}
        currentName={minerDisplayName}
        onConfirm={handleLoginConfirm}
        onGoogleLogin={handleGoogleLogin}
        googleUser={currentUser}
        onClose={() => setIsLoginModalOpen(false)}
      />

      {/* FULLSCREEN DRAMATIC CINEMATIC INTRO ("CRAFT KA SURFERS" FLYING OUT OF SCREEN + SLOW TURN TO BLACK) */}
      {showCinematicIntro && (
        <CinematicIntro onComplete={() => setShowCinematicIntro(false)} />
      )}
    </div>
  );
}
