import type { Body } from './body';

export interface DodgeAim {
  dirX: number;
  dirY: number;
  angle: number;
  flip: boolean;
}

const ANGLE_STEP = Math.PI / 12;

export function aimDodge(body: Body, aimX: number, aimY: number, facing: number): DodgeAim {
  let dx = aimX - body.x;
  let dy = aimY - (body.y - body.h / 2);
  let len = Math.hypot(dx, dy);
  if (len < 1) {
    dx = facing;
    dy = 0;
    len = 1;
  }
  dx /= len;
  dy /= len;
  const flip = dx < 0;
  const raw = Math.atan2(dy, flip ? -dx : dx);
  return { dirX: dx, dirY: dy, angle: Math.round(raw / ANGLE_STEP) * ANGLE_STEP, flip };
}
