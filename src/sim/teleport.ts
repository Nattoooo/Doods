import type { Arena } from './arena';
import type { Body } from './body';
import type { MovementTuning } from './tuning';

export interface TeleportPlan {
  x: number;
  y: number;
  distance: number;
  dirX: number;
  dirY: number;
}

export function planTeleport(
  arena: Arena,
  body: Body,
  aimX: number,
  aimY: number,
  facing: number,
  tuning: MovementTuning,
): TeleportPlan | null {
  const hw = body.w / 2;
  const hh = body.h / 2;
  const cx = body.x;
  const cy = body.y - hh;
  let dx = aimX - cx;
  let dy = aimY - cy;
  let len = Math.hypot(dx, dy);
  if (len < 1) {
    dx = facing;
    dy = 0;
    len = 1;
  }
  dx /= len;
  dy /= len;

  let reach = 0;
  for (let d = 1; d <= tuning.teleportDistance; d++) {
    const px = cx + dx * d;
    const py = cy + dy * d;
    if (arena.solidInRect(px - hw, py - hh, px + hw, py + hh)) break;
    reach = d;
  }
  if (reach < tuning.teleportMinDistance) return null;
  return { x: cx + dx * reach, y: cy + dy * reach + hh, distance: reach, dirX: dx, dirY: dy };
}
