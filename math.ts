import { Vector2 } from '../types';
import { TILE_WIDTH, TILE_HEIGHT } from '../constants';

// Convert World Grid/Physics Coordinates to Screen Pixels (Isometric)
export const worldToIso = (pos: Vector2, cameraOffset: Vector2): Vector2 => {
  const isoX = (pos.x - pos.y) * (TILE_WIDTH / 2);
  const isoY = (pos.x + pos.y) * (TILE_HEIGHT / 2);
  return {
    x: isoX + cameraOffset.x,
    y: isoY + cameraOffset.y,
  };
};

// Convert Screen Pixels to World Grid (Approximate, for mouse picking)
export const isoToWorld = (screen: Vector2, cameraOffset: Vector2): Vector2 => {
  const adjX = screen.x - cameraOffset.x;
  const adjY = screen.y - cameraOffset.y;
  
  const y = (adjY / (TILE_HEIGHT/2) - adjX / (TILE_WIDTH/2)) / 2;
  const x = (adjY / (TILE_HEIGHT/2) + adjX / (TILE_WIDTH/2)) / 2;
  
  return { x, y };
};

export const distance = (a: Vector2, b: Vector2) => {
  return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
};

export const angleToTarget = (from: Vector2, to: Vector2) => {
  return Math.atan2(to.y - from.y, to.x - from.x);
};

export const lerp = (start: number, end: number, t: number) => {
  return start * (1 - t) + end * t;
};

export const clamp = (num: number, min: number, max: number) => {
  return Math.min(Math.max(num, min), max);
};