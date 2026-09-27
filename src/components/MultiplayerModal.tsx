import React, { useState } from 'react';
import { db, handleFirestoreError, OperationType } from '../firebase/config.ts';
import { doc, setDoc, getDocs, collection, query, where, updateDoc } from 'firebase/firestore';
import { RaceRoom } from '../game/types.ts';
import { Users, Copy, Check, Play, ArrowRight, X, AlertCircle } from 'lucide-react';
import { sound } from '../sound/audio.ts';

interface MultiplayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
  onStartRace: (room: RaceRoom, isHost: boolean) => void;
}

export const MultiplayerModal: React.FC<MultiplayerModalProps> = ({
  isOpen,
  onClose,
  userId,
  userName,
  onStartRace,
}) => {
  const [tab, setTab] = useState<'create' | 'join'>('create');
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [createdRoom, setCreatedRoom] = useState<RaceRoom | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  // Generate 6-char room code
  const generateRoomCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const handleCreateRoom = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const code = generateRoomCode();
      const roomId = `room_${code}_${Date.now()}`;
      const seed = Math.floor(Math.random() * 1000000) + 1;

      const newRoom: RaceRoom = {
        id: roomId,
        roomCode: code,
        seed,
        status: 'waiting',
        targetDistance: 1000,
        hostId: userId,
        hostName: userName || 'Host Steve',
        hostProgress: {
          distance: 0,
          score: 0,
          lane: 0,
          isDead: false,
          updatedAt: Date.now(),
        },
        guestId: null,
        guestName: null,
        guestProgress: null,
        winnerId: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const docRef = doc(db, 'rooms', roomId);
      await setDoc(docRef, newRoom);
      setCreatedRoom(newRoom);
      sound.playPowerUp();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'rooms');
      setErrorMsg('Failed to create room. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinRoom = async () => {
    const code = roomCodeInput.trim().toUpperCase();
    if (!code || code.length < 4) {
      setErrorMsg('Please enter a valid room code.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    try {
      const q = query(collection(db, 'rooms'), where('roomCode', '==', code));
      const snap = await getDocs(q);

      if (snap.empty) {
        setErrorMsg('Room not found! Check the code and try again.');
        setLoading(false);
        return;
      }

      const roomDoc = snap.docs[0];
      const roomData = roomDoc.data() as RaceRoom;

      if (roomData.status !== 'waiting') {
        setErrorMsg('This race has already started or finished.');
        setLoading(false);
        return;
      }

      // Join room as guest and start countdown
      const updatedGuest = {
        guestId: userId,
        guestName: userName || 'Racer Alex',
        guestProgress: {
          distance: 0,
          score: 0,
          lane: 0,
          isDead: false,
          updatedAt: Date.now(),
        },
        status: 'racing' as const,
        updatedAt: new Date().toISOString(),
      };

      await updateDoc(doc(db, 'rooms', roomDoc.id), updatedGuest);

      const fullRoom: RaceRoom = {
        ...roomData,
        ...updatedGuest,
      };

      sound.playPowerUp();
      onStartRace(fullRoom, false);
      onClose();
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'rooms');
      setErrorMsg('Error joining room. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      id="multiplayer-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
    >
      <div
        id="multiplayer-modal-container"
        className="w-full max-w-md bg-[#1a1e24] border-2 border-[#474e5d] rounded-xl shadow-2xl overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-[#14171c]">
          <div className="flex items-center gap-2.5">
            <Users className="w-5 h-5 text-sky-400" />
            <h2 className="font-minecraft text-sm sm:text-base text-white tracking-wide">
              Online Multiplayer Race
            </h2>
          </div>

          <button
            id="close-multiplayer-button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        {!createdRoom && (
          <div className="grid grid-cols-2 p-3 bg-black/30 border-b border-white/5 gap-2">
            <button
              onClick={() => { setTab('create'); setErrorMsg(''); }}
              className={`py-2 text-xs font-minecraft rounded transition-colors cursor-pointer ${
                tab === 'create'
                  ? 'bg-sky-500/20 border border-sky-400 text-sky-300'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Host Match
            </button>
            <button
              onClick={() => { setTab('join'); setErrorMsg(''); }}
              className={`py-2 text-xs font-minecraft rounded transition-colors cursor-pointer ${
                tab === 'join'
                  ? 'bg-sky-500/20 border border-sky-400 text-sky-300'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Join with Code
            </button>
          </div>
        )}

        {/* Content */}
        <div className="p-5 flex flex-col gap-4">
          {errorMsg && (
            <div className="p-3 bg-red-900/30 border border-red-500/40 rounded flex items-center gap-2 text-xs text-red-300">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Mode: Create Room & Waiting */}
          {tab === 'create' && (
            <div>
              {!createdRoom ? (
                <div className="text-center py-4 flex flex-col items-center gap-3">
                  <p className="text-xs text-gray-300 leading-relaxed max-w-xs font-sans">
                    Create a private room code and invite a friend to race head-to-head on the identical track!
                  </p>
                  <button
                    id="create-room-btn"
                    onClick={handleCreateRoom}
                    disabled={loading}
                    className="mc-button mc-button-green w-full py-3 px-6 text-white text-sm flex items-center justify-center gap-2 cursor-pointer mt-2"
                  >
                    <Play className="w-4 h-4" />
                    {loading ? 'Creating...' : 'Create Race Room'}
                  </button>
                </div>
              ) : (
                <div className="text-center py-3 flex flex-col items-center gap-4">
                  <span className="text-xs text-gray-400 font-sans">Share this Room Code with your friend:</span>

                  {/* Room Code Display */}
                  <div className="flex items-center gap-2 bg-black/60 border-2 border-sky-400/60 rounded-lg px-5 py-3">
                    <span id="room-code-display" className="font-minecraft text-3xl tracking-widest text-yellow-400">
                      {createdRoom.roomCode}
                    </span>
                    <button
                      onClick={() => handleCopyCode(createdRoom.roomCode)}
                      className="p-2 bg-white/10 hover:bg-white/20 rounded cursor-pointer transition-colors"
                      title="Copy Code"
                    >
                      {copied ? <Check className="w-5 h-5 text-emerald-400" /> : <Copy className="w-5 h-5 text-white" />}
                    </button>
                  </div>

                  {/* Waiting pulse */}
                  <div className="flex items-center gap-2 text-xs text-sky-300 font-minecraft">
                    <span className="w-2.5 h-2.5 rounded-full bg-sky-400 animate-ping"></span>
                    <span>Waiting for opponent to join...</span>
                  </div>

                  <p className="text-[11px] text-gray-400 font-sans max-w-xs">
                    Target: First to reach 1,000 meters or last runner standing wins!
                  </p>

                  <button
                    onClick={() => {
                      onStartRace(createdRoom, true);
                      onClose();
                    }}
                    className="mc-button w-full py-3 text-white text-xs cursor-pointer"
                  >
                    Enter Track As Host (Auto-launches on join)
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Mode: Join with Room Code */}
          {tab === 'join' && (
            <div className="flex flex-col gap-4 py-2">
              <label className="text-xs text-gray-300 font-sans">
                Enter the 6-character room code from your friend:
              </label>

              <input
                id="join-room-input"
                type="text"
                maxLength={6}
                value={roomCodeInput}
                onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                placeholder="e.g. AB12CD"
                className="w-full bg-black/60 border-2 border-white/20 focus:border-sky-400 rounded-lg px-4 py-3 text-center font-minecraft text-xl tracking-widest text-yellow-400 placeholder:text-gray-600 outline-none uppercase"
              />

              <button
                id="join-room-submit-btn"
                onClick={handleJoinRoom}
                disabled={loading || !roomCodeInput.trim()}
                className="mc-button mc-button-green w-full py-3 px-6 text-white text-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <ArrowRight className="w-4 h-4" />
                {loading ? 'Joining Room...' : 'Enter Race'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
