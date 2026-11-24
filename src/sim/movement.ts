import { SIM_DT } from '../config';
import { approach, sign } from '../core/math';
import { Action, axisX, isHeld, isPressed } from '../core/input';
import type { InputState } from '../core/input';
import type { Arena } from './arena';
import { groundBelow, moveX, moveY, wallSide } from './body';
import type { Body } from './body';
import { jumpSpeed } from './tuning';
import type { MovementTuning } from './tuning';

export interface MovementState {
  grounded: boolean;
  wallDir: number;
  sliding: boolean;
  airJumpsLeft: number;
  coyote: number;
  jumpBuffer: number;
  kickLock: number;
  facing: number;
  cutImmune: boolean;
}

export interface MovementFlags {
  jumped: boolean;
  airJumped: boolean;
  wallKicked: boolean;
  landed: boolean;
  landSpeed: number;
  kickDir: number;
}

export function createMovementState(tuning: MovementTuning): MovementState {
  return {
    grounded: false,
    wallDir: 0,
    sliding: false,
    airJumpsLeft: tuning.airJumps,
    coyote: 0,
    jumpBuffer: 0,
    kickLock: 0,
    facing: 1,
    cutImmune: false,
  };
}

export function createMovementFlags(): MovementFlags {
  return { jumped: false, airJumped: false, wallKicked: false, landed: false, landSpeed: 0, kickDir: 0 };
}

export function senseContacts(arena: Arena, body: Body, state: MovementState, tuning: MovementTuning): void {
  state.grounded = groundBelow(arena, body, 0.1);
  state.wallDir = state.grounded ? 0 : wallSide(arena, body, tuning.wallProbe, 2);
}

export function stepMovement(
  arena: Arena,
  body: Body,
  state: MovementState,
  tuning: MovementTuning,
  input: InputState,
  flags: MovementFlags,
): void {
  const dt = SIM_DT;
  flags.jumped = false;
  flags.airJumped = false;
  flags.wallKicked = false;
  flags.landed = false;
  flags.landSpeed = 0;
  flags.kickDir = 0;

  const axis = axisX(input);
  const wasGrounded = state.grounded;

  if (isPressed(input, Action.Jump)) state.jumpBuffer = tuning.jumpBuffer;
  else state.jumpBuffer = Math.max(0, state.jumpBuffer - dt);

  if (state.grounded) {
    state.coyote = tuning.coyote;
    state.airJumpsLeft = tuning.airJumps;
  } else {
    state.coyote = Math.max(0, state.coyote - dt);
  }
  state.kickLock = Math.max(0, state.kickLock - dt);

  if (state.kickLock === 0) {
    const target = axis * tuning.runSpeed;
    const accelBase = state.grounded ? tuning.groundAccel : tuning.airAccel;
    let accel: number;
    if (axis === 0) accel = state.grounded ? tuning.groundDecel : tuning.airDecel;
    else if (body.vx !== 0 && sign(body.vx) !== axis) accel = accelBase * tuning.turnMul;
    else accel = accelBase;
    body.vx = approach(body.vx, target, accel * dt);
    if (axis !== 0) state.facing = axis;
  }

  if (state.jumpBuffer > 0) {
    if (state.grounded || state.coyote > 0) {
      body.vy = -jumpSpeed(tuning.gravity, tuning.jumpHeight);
      state.grounded = false;
      state.coyote = 0;
      state.jumpBuffer = 0;
      flags.jumped = true;
    } else if (state.wallDir !== 0) {
      const away = -state.wallDir;
      body.vx = away * tuning.wallKickVX;
      body.vy = -jumpSpeed(tuning.gravity, tuning.wallKickHeight);
      state.kickLock = tuning.wallKickLock;
      state.facing = away;
      state.wallDir = 0;
      state.jumpBuffer = 0;
      if (tuning.refillAirJumpsOnWallKick) state.airJumpsLeft = tuning.airJumps;
      flags.wallKicked = true;
      flags.kickDir = away;
    } else if (state.airJumpsLeft > 0) {
      body.vy = -jumpSpeed(tuning.gravity, tuning.airJumpHeight);
      state.airJumpsLeft--;
      state.jumpBuffer = 0;
      flags.airJumped = true;
    }
  }

  state.sliding = state.wallDir !== 0 && !state.grounded && body.vy >= 0 && axis === state.wallDir;
  if (state.sliding) state.facing = -state.wallDir;

  if (state.grounded || body.vy >= 0) state.cutImmune = false;
  let g = tuning.gravity;
  if (body.vy > 0) g *= tuning.fallMul;
  else if (body.vy < 0 && !isHeld(input, Action.Jump) && !state.cutImmune) g *= tuning.cutMul;
  body.vy += g * dt;
  body.vy = Math.min(body.vy, state.sliding ? tuning.wallSlideSpeed : tuning.maxFall);

  const impact = body.vy;
  if (moveX(arena, body, body.vx * dt)) body.vx = 0;
  const hitY = moveY(arena, body, body.vy * dt);
  if (hitY !== 0) body.vy = 0;

  senseContacts(arena, body, state, tuning);

  if (!wasGrounded && state.grounded) {
    flags.landed = true;
    flags.landSpeed = impact;
  }
}
