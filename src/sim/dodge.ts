const ANGLE_STEP = Math.PI / 12;

export function snapAngle(angle: number): number {
  return Math.round(angle / ANGLE_STEP) * ANGLE_STEP;
}

export function directionAngle(dirX: number, dirY: number): { angle: number; flip: boolean } {
  const flip = dirX < 0;
  return { angle: snapAngle(flip ? Math.atan2(-dirY, -dirX) : Math.atan2(dirY, dirX)), flip };
}
