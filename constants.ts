import { GameConfig } from './types';

export const CONFIG: GameConfig = {
  tileSize: 40,
  mapWidth: 30, // tiles
  mapHeight: 30, // tiles
};

export const COLORS = {
  background: '#0f0518', // Deep Indigo
  grid: '#2e1065', // Dark Purple
  primary: '#06b6d4', // Cyan
  accent: '#d946ef', // Magenta
  danger: '#f97316', // Orange
  success: '#10b981', // Emerald
  text: '#e0e7ff',
  hudBg: 'rgba(15, 23, 42, 0.85)',
};

export const ASSETS = {
  tankBody: 'tank-body',
  tankTurret: 'tank-turret',
};

// Isometric projection constants
// 2:1 ratio is standard for pixel art, but we can use math for smooth vectors.
// 30 degrees is approx Math.PI / 6.
export const ISO_ANGLE = Math.PI / 6; 
export const TILE_WIDTH = CONFIG.tileSize * 2;
export const TILE_HEIGHT = CONFIG.tileSize; 
