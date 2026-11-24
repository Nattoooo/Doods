export interface MovementTuning {
  bodyW: number;
  bodyH: number;
  runSpeed: number;
  groundAccel: number;
  groundDecel: number;
  airAccel: number;
  airDecel: number;
  turnMul: number;
  gravity: number;
  fallMul: number;
  cutMul: number;
  maxFall: number;
  jumpHeight: number;
  airJumpHeight: number;
  airJumps: number;
  coyote: number;
  jumpBuffer: number;
  wallProbe: number;
  wallSlideSpeed: number;
  wallKickVX: number;
  wallKickHeight: number;
  wallKickLock: number;
  refillAirJumpsOnWallKick: boolean;
  runAnimThreshold: number;
  riseThreshold: number;
}

export const DEFAULT_MOVEMENT: MovementTuning = {
  bodyW: 8,
  bodyH: 20,
  runSpeed: 150,
  groundAccel: 2400,
  groundDecel: 3000,
  airAccel: 1800,
  airDecel: 600,
  turnMul: 1.6,
  gravity: 1150,
  fallMul: 0.8,
  cutMul: 2.6,
  maxFall: 420,
  jumpHeight: 56,
  airJumpHeight: 34,
  airJumps: 2,
  coyote: 0.08,
  jumpBuffer: 0.1,
  wallProbe: 1.5,
  wallSlideSpeed: 70,
  wallKickVX: 150,
  wallKickHeight: 36,
  wallKickLock: 0.14,
  refillAirJumpsOnWallKick: true,
  runAnimThreshold: 20,
  riseThreshold: 80,
};

export function jumpSpeed(gravity: number, height: number): number {
  return Math.sqrt(2 * gravity * height);
}
