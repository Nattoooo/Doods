import type { FighterClips } from '../content/character';
import type { Controller } from '../core/controller';
import { SIM_DT } from '../config';
import { Action, isPressed } from '../core/input';
import { Animator } from './animator';
import { createBody, moveX, moveY } from './body';
import type { Body } from './body';
import { SimEvent } from './events';
import { createMovementFlags, createMovementState, senseContacts, stepMovement } from './movement';
import type { MovementFlags, MovementState } from './movement';
import { aimDodge } from './dodge';
import type { DodgeAim } from './dodge';
import { DEFAULT_MOVEMENT } from './tuning';
import type { MovementTuning } from './tuning';
import type { World } from './world';

export interface FighterInit {
  id: number;
  name: string;
  color: number;
  x: number;
  y: number;
  controller: Controller;
  clips: FighterClips;
  tuning?: MovementTuning;
  maxHealth?: number;
}

export class Fighter {
  readonly id: number;
  readonly name: string;
  readonly controller: Controller;
  readonly clips: FighterClips;
  readonly tuning: MovementTuning;
  readonly body: Body;
  readonly move: MovementState;
  readonly animator: Animator;
  readonly flags: MovementFlags = createMovementFlags();
  color: number;
  tint: number;
  health: number;
  maxHealth: number;
  dodgeCooldown = 0;
  dodgeTime = 0;
  dodgeAim: DodgeAim = { dirX: 1, dirY: 0, angle: 0, flip: false };
  aimX = 0;
  aimY = 0;

  private dodgeTicks = 0;
  private spawnX: number;
  private spawnY: number;
  private world: World | null = null;

  constructor(init: FighterInit) {
    this.id = init.id;
    this.name = init.name;
    this.color = init.color;
    this.tint = init.color;
    this.controller = init.controller;
    this.clips = init.clips;
    this.tuning = init.tuning ?? DEFAULT_MOVEMENT;
    this.maxHealth = init.maxHealth ?? 100;
    this.health = this.maxHealth;
    this.spawnX = init.x;
    this.spawnY = init.y;
    this.body = createBody(init.x, init.y, this.tuning.bodyW, this.tuning.bodyH);
    this.move = createMovementState(this.tuning);
    this.animator = new Animator((name) => this.onAnimEvent(name));
    this.animator.play(this.clips.idle);
  }

  attach(world: World): void {
    this.world = world;
    senseContacts(world.arena, this.body, this.move, this.tuning);
  }

  respawn(): void {
    this.body.x = this.spawnX;
    this.body.y = this.spawnY;
    this.body.vx = 0;
    this.body.vy = 0;
    this.health = this.maxHealth;
    this.move.kickLock = 0;
    this.move.jumpBuffer = 0;
    this.move.facing = 1;
    this.dodgeCooldown = 0;
    this.dodgeTime = 0;
    this.animator.play(this.clips.idle, true);
    if (this.world) senseContacts(this.world.arena, this.body, this.move, this.tuning);
  }

  step(world: World): void {
    const input = this.controller.read(this, world);
    this.aimX = input.aimX;
    this.aimY = input.aimY;
    this.dodgeCooldown = Math.max(0, this.dodgeCooldown - SIM_DT);
    if (isPressed(input, Action.Dodge) && this.dodgeCooldown === 0 && !this.dodging) this.startDodge(world);
    if (this.dodging) {
      this.stepDodge(world);
      this.animator.play(this.clips.run);
      this.animator.step();
      return;
    }
    stepMovement(world.arena, this.body, this.move, this.tuning, input, this.flags);
    this.emitMovementEvents(world);
    this.driveAnimation();
    this.animator.step();
  }

  get dodging(): boolean {
    return this.dodgeTime > 0;
  }

  get invulnerable(): boolean {
    return this.dodging;
  }

  get dodgeReady(): number {
    return 1 - this.dodgeCooldown / this.tuning.dodgeCooldown;
  }

  private startDodge(world: World): void {
    const b = this.body;
    this.dodgeAim = aimDodge(b, this.aimX, this.aimY, this.move.facing);
    this.dodgeTime = this.tuning.dodgeDuration;
    this.dodgeCooldown = this.tuning.dodgeCooldown;
    this.dodgeTicks = 0;
    this.move.facing = this.dodgeAim.flip ? -1 : 1;
    this.move.kickLock = 0;
    this.move.jumpBuffer = 0;
    this.move.sliding = false;
    world.emit({
      type: SimEvent.Dodge,
      fighterId: this.id,
      x: b.x,
      y: b.y - b.h / 2,
      dir: this.move.facing,
      power: this.tuning.dodgeSpeed,
      tint: this.tint,
      angle: this.dodgeAim.angle,
    });
  }

  private stepDodge(world: World): void {
    const b = this.body;
    const t = this.tuning;
    const aim = this.dodgeAim;
    const px = b.x;
    const py = b.y;
    b.vx = aim.dirX * t.dodgeSpeed;
    b.vy = aim.dirY * t.dodgeSpeed;
    moveX(world.arena, b, b.vx * SIM_DT);
    moveY(world.arena, b, b.vy * SIM_DT);
    senseContacts(world.arena, b, this.move, t);

    if (this.dodgeTicks % t.dodgeTrailTicks === 0) {
      world.emit({
        type: SimEvent.DodgeTrail,
        fighterId: this.id,
        x: b.x,
        y: b.y - b.h / 2,
        dir: this.move.facing,
        power: 0,
        tint: this.tint,
        angle: aim.angle,
        index: this.dodgeTicks / t.dodgeTrailTicks,
      });
    }
    this.dodgeTicks++;

    this.dodgeTime -= SIM_DT;
    const moved = Math.hypot(b.x - px, b.y - py);
    if (this.dodgeTime <= 0 || moved < t.dodgeSpeed * SIM_DT * 0.25) {
      this.dodgeTime = 0;
      b.vx = aim.dirX * t.dodgeSpeed * t.dodgeExitFactor;
      b.vy = aim.dirY * t.dodgeSpeed * t.dodgeExitFactor;
    }
  }

  private emitMovementEvents(world: World): void {
    const f = this.flags;
    const b = this.body;
    if (f.jumped) world.emit({ type: SimEvent.Jump, fighterId: this.id, x: b.x, y: b.y, dir: this.move.facing, power: 1, tint: this.tint });
    if (f.airJumped) world.emit({ type: SimEvent.AirJump, fighterId: this.id, x: b.x, y: b.y, dir: this.move.facing, power: 1, tint: this.tint });
    if (f.wallKicked) world.emit({ type: SimEvent.WallKick, fighterId: this.id, x: b.x, y: b.y - b.h * 0.4, dir: f.kickDir, power: 1, tint: this.tint });
    if (f.landed) world.emit({ type: SimEvent.Land, fighterId: this.id, x: b.x, y: b.y, dir: this.move.facing, power: f.landSpeed, tint: this.tint });
  }

  private onAnimEvent(name: string): void {
    if (!this.world || this.dodging || name !== SimEvent.Step) return;
    const b = this.body;
    this.world.emit({ type: SimEvent.Step, fighterId: this.id, x: b.x, y: b.y, dir: this.move.facing, power: Math.abs(b.vx), tint: this.tint });
  }

  private driveAnimation(): void {
    const a = this.animator;
    const c = this.clips;
    const s = this.move;
    const b = this.body;
    const f = this.flags;
    const t = this.tuning;

    if (f.wallKicked) return a.play(c.wallKick, true);
    if (f.airJumped) return a.play(c.doubleJump, true);
    if (f.jumped) return a.play(c.jumpStart, true);
    if (f.landed) return a.play(c.land, true);

    if (s.grounded) {
      const moving = Math.abs(b.vx) > t.runAnimThreshold;
      if (a.clip === c.land && !a.finished && !moving) return;
      return a.play(moving ? c.run : c.idle);
    }

    if (s.sliding) return a.play(c.wallSlide);

    const clip = a.clip;
    const oneShot = clip === c.jumpStart || clip === c.doubleJump || clip === c.wallKick;
    if (oneShot && !a.finished) return;

    if (b.vy < -t.riseThreshold) a.play(c.rise);
    else if (b.vy < t.riseThreshold) a.play(c.apex);
    else a.play(c.fall);
  }
}
