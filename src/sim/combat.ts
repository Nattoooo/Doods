import { clamp } from '../core/math';
import type { Arena } from './arena';
import type { Body } from './body';
import type { Fighter } from './fighter';

export interface Box {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export function bodyBox(f: Fighter, pad = 1): Box {
  const b = f.body;
  return { x0: b.x - b.w / 2 - pad, y0: b.y - b.h - pad, x1: b.x + b.w / 2 + pad, y1: b.y + pad };
}

export function boxAround(cx: number, cy: number, hw: number, hh: number): Box {
  return { x0: cx - hw, y0: cy - hh, x1: cx + hw, y1: cy + hh };
}

export function boxesOverlap(a: Box, b: Box): boolean {
  return a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;
}

export function circleOverlapsBox(cx: number, cy: number, r: number, b: Box): boolean {
  const nx = clamp(cx, b.x0, b.x1);
  const ny = clamp(cy, b.y0, b.y1);
  return (cx - nx) ** 2 + (cy - ny) ** 2 <= r * r;
}

export function normalize(x: number, y: number, fallbackX = 1, fallbackY = 0): { x: number; y: number } {
  const len = Math.hypot(x, y);
  if (len < 1e-6) return { x: fallbackX, y: fallbackY };
  return { x: x / len, y: y / len };
}

export function freeDistance(arena: Arena, body: Body, dx: number, dy: number, max: number): number {
  const hw = body.w / 2;
  const hh = body.h / 2;
  const cx = body.x;
  const cy = body.y - hh;
  let reach = 0;
  for (let d = 2; d <= max; d += 2) {
    const px = cx + dx * d;
    const py = cy + dy * d;
    if (arena.solidInRect(px - hw, py - hh, px + hw, py + hh)) break;
    reach = d;
  }
  return reach;
}

export function dodgeAround(vx: number, vy: number, dx: number, dy: number, fallbackSign: number): { x: number; y: number } {
  const n = normalize(vx, vy);
  let px = -n.y;
  let py = n.x;
  const side = px * dx + py * dy;
  if (Math.abs(side) < 0.5) {
    const s = fallbackSign < 0 ? -1 : 1;
    px *= s;
    py *= s;
  } else if (side < 0) {
    px = -px;
    py = -py;
  }
  return { x: px, y: py };
}
