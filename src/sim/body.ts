import { TILE } from '../config';
import type { Arena } from './arena';

export interface Body {
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
}

const EPS = 1e-4;

export function createBody(x: number, y: number, w: number, h: number): Body {
  return { x, y, w, h, vx: 0, vy: 0 };
}

export function moveX(arena: Arena, b: Body, dx: number): boolean {
  if (dx === 0) return false;
  b.x += dx;
  const hw = b.w / 2;
  const edge = dx > 0 ? b.x + hw : b.x - hw;
  const col = Math.floor((edge - arena.originX + (dx > 0 ? -EPS : EPS)) / TILE);
  const r0 = Math.floor((b.y - b.h + EPS - arena.originY) / TILE);
  const r1 = Math.floor((b.y - EPS - arena.originY) / TILE);
  for (let r = r0; r <= r1; r++) {
    if (arena.isSolid(col, r)) {
      b.x = dx > 0 ? arena.tileX(col) - hw : arena.tileX(col + 1) + hw;
      return true;
    }
  }
  return false;
}

export function moveY(arena: Arena, b: Body, dy: number): number {
  if (dy === 0) return 0;
  b.y += dy;
  const hw = b.w / 2;
  const edge = dy > 0 ? b.y : b.y - b.h;
  const row = Math.floor((edge - arena.originY + (dy > 0 ? -EPS : EPS)) / TILE);
  const c0 = Math.floor((b.x - hw + EPS - arena.originX) / TILE);
  const c1 = Math.floor((b.x + hw - EPS - arena.originX) / TILE);
  for (let c = c0; c <= c1; c++) {
    if (arena.isSolid(c, row)) {
      b.y = dy > 0 ? arena.tileY(row) : arena.tileY(row + 1) + b.h;
      return dy > 0 ? 1 : -1;
    }
  }
  return 0;
}

export function groundBelow(arena: Arena, b: Body, probe: number): boolean {
  const hw = b.w / 2;
  return arena.solidInRect(b.x - hw + EPS, b.y, b.x + hw - EPS, b.y + probe);
}

export function wallSide(arena: Arena, b: Body, probe: number, inset: number): number {
  const hw = b.w / 2;
  const top = b.y - b.h + inset;
  const bottom = b.y - inset;
  if (arena.solidInRect(b.x - hw - probe, top, b.x - hw, bottom)) return -1;
  if (arena.solidInRect(b.x + hw, top, b.x + hw + probe, bottom)) return 1;
  return 0;
}
