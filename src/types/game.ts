export type FactionId = 'player' | 'ai1' | 'ai2' | 'ai3' | 'ai4' | 'neutral';

export interface FactionInfo {
  id: FactionId;
  name: string;
  color: string;
  isAI: boolean;
}

export type PlanetType = 'standard' | 'turret' | 'portal' | 'mothership' | 'bfg';

export interface Planet {
  id: string;
  name: string;
  x: number;
  y: number;
  radius: number;
  maxShips: number;
  ships: number;
  owner: FactionId;
  type: PlanetType;
  productionRate: number;
  portalTargetId?: string;
  turretRange?: number;
  turretCooldown?: number;
  // BFG Superweapon state
  bfgCharge?: number; // 0 to 18 seconds
  bfgCooldown?: number; // cooldown remaining in seconds
  bfgFiringTimer?: number; // active beam duration (e.g. 0.8s)
  bfgBeamTarget?: { x: number; y: number; targetPlanetId: string };
  bfgWarmupTimer?: number; // Star Wars tributary convergence warmup (e.g. 0.65s)
  bfgWarmupTarget?: { x: number; y: number; targetPlanetId: string };
  empTimer?: number; // EMP paralysis duration in seconds (frozen production/turrets)
  // Capture progress: 0 to 1. When > 0, planet is being captured.
  captureProgress: number;
  capturingFaction: FactionId | null;
  // Combat state
  inCombat: boolean;
  pulsePhase: number;
  turretAngle?: number;
  targetLockId?: string;
  absorbAccum?: number;
}

export interface Ship {
  id: string;
  faction: FactionId;
  x: number;
  y: number;
  vx: number;
  vy: number;
  state: 'transit' | 'orbit';
  sourcePlanetId: string;
  targetPlanetId: string;
  finalTargetId?: string;
  orbitAngle?: number;
  orbitRadius?: number;
  orbitDirection?: number;
  curveOffset: number;
  cooldown?: number; // for shooting
  warpCooldown?: number;
}

export interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  life: number;
  maxLife: number;
  size?: number;
  type?: 'spark' | 'shockwave';
}

export interface Laser {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  targetId?: string;
  targetPlanetId?: string;
  color: string;
  life: number;
  maxLife: number;
}

export interface LevelConfig {
  id: string;
  name: string;
  description: string;
  difficulty: 'Easy' | 'Medium' | 'Hard' | 'Insane' | 'LATAM' | 'Custom';
  width: number;
  height: number;
  planets: Planet[];
  activeFactions: FactionId[];
}

export type GameState = 'menu' | 'playing' | 'multiplayer_playing' | 'paused' | 'victory' | 'defeat' | 'editor' | 'cinematic';

export interface GameStats {
  shipsProduced: number;
  shipsDestroyed: number;
  planetsCaptured: number;
  startTime: number;
  endTime: number;
}
