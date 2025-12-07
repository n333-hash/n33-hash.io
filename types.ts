export type Vector2 = { x: number; y: number };

export enum EntityType {
  PLAYER,
  ENEMY_LIGHT,
  ENEMY_HEAVY,
  OBSTACLE,
  PROJECTILE,
  PARTICLE,
  PICKUP,
  SMART_BOMB
}

export interface Entity {
  id: string;
  type: EntityType;
  pos: Vector2;
  vel: Vector2;
  width: number; // In world units
  height: number; // In world units
  rotation: number; // Body rotation
  turretRotation?: number;
  hp: number;
  maxHp: number;
  color: string;
  dead: boolean;
  targetPos?: Vector2; // For AI or Turrets
  cooldown?: number;
  maxCooldown?: number;
  glow?: number; // Visual effect intensity (0.0 to 1.0)
}

export interface Particle extends Entity {
  life: number;
  maxLife: number;
  scale: number;
  startColor: string;
  endColor: string;
}

export interface GameConfig {
  tileSize: number;
  mapWidth: number;
  mapHeight: number;
}

export interface ChatMessage {
  role: 'user' | 'model' | 'system';
  text: string;
  timestamp: number;
}

export enum GameStatus {
  MENU,
  PLAYING,
  SHOP,
  GAME_OVER
}