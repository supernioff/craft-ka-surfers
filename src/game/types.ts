export type Lane = -1 | 0 | 1;

export const LANE_COORDS: Record<Lane, number> = {
  [-1]: -2.6,
  [0]: 0,
  [1]: 2.6,
};

export type ObstacleType = 'minecart' | 'rock' | 'ghost' | 'barrier_high';
export type ItemType = 'diamond' | 'coin' | 'golden_apple' | 'magnet' | 'potion';
export type RunnerSkin = 'steve' | 'diamond' | 'nether' | 'gold';
export type GameTheme = 'day_walk' | 'night_walk' | 'closed_cave' | 'water_walk';

export interface ThemeConfig {
  id: GameTheme;
  name: string;
  subtitle: string;
  icon: string;
  badge: string;
  skyColor: number;
  fogColor: number;
  fogNear: number;
  fogFar: number;
  ambientColor: number;
  ambientIntensity: number;
  sunColor: number;
  sunIntensity: number;
  wallColor: number;
  roadColor: number;
  hasRoof: boolean;
  hasWater: boolean;
  hasClouds: boolean;
  particleType: 'spores' | 'fireflies' | 'bubbles' | 'sun_dust';
  themeColor: string;
  borderColor: string;
}

export interface ObstacleInstance {
  id: number;
  type: ObstacleType;
  lane: Lane;
  z: number;
  y: number;
  width: number;
  height: number;
  depth: number;
  speed: number; // for moving minecarts
  mesh?: any;
  passed?: boolean;
  nearMissAwarded?: boolean;
}

export interface ItemInstance {
  id: number;
  type: ItemType;
  lane: Lane;
  z: number;
  y: number;
  mesh?: any;
  collected?: boolean;
}

export interface PlayerState {
  lane: Lane;
  x: number;
  y: number;
  z: number;
  isJumping: boolean;
  isSliding: boolean;
  jumpVelocity: number;
  distance: number;
  score: number;
  coins: number;
  multiplier: number;
  invincibleTimer: number;
  magnetTimer: number;
  isDead: boolean;
  causeOfDeath: string;
  chaserDistance: number;
  nearMissCount: number;
  comboStreak: number;
  currentZone: string;
  skin: RunnerSkin;
}

export interface GuestProfile {
  uniqueId: string;
  displayName: string;
  selectedSkin: RunnerSkin;
  lifetimeCoins: number;
  lifetimeDistance: number;
  totalRuns: number;
  personalBest: number;
  bestCombo: number;
  completedMissions: string[];
}

export interface HighScoreRecord {
  id?: string;
  userId: string;
  displayName: string;
  score: number;
  distance: number;
  coins: number;
  createdAt: string;
}

export interface PlayerProgress {
  distance: number;
  score: number;
  lane: number;
  isDead: boolean;
  updatedAt: number;
}

export interface RaceRoom {
  id: string;
  roomCode: string;
  seed: number;
  status: 'waiting' | 'countdown' | 'racing' | 'finished';
  targetDistance: number; // e.g. 1000m
  hostId: string;
  hostName: string;
  hostProgress: PlayerProgress;
  guestId?: string | null;
  guestName?: string | null;
  guestProgress?: PlayerProgress | null;
  winnerId?: string | null;
  countdownStart?: number | null;
  createdAt: string;
  updatedAt: string;
}
