import { SIM_DT } from '../config';
import type { FighterClips } from '../content/character';
import type { ClipDef } from '../content/clips';
import type { Controller } from '../core/controller';
import { Action, NO_INPUT, SLOT_ACTIONS, SUPPORT_ACTIONS, isPressed } from '../core/input';
import type { InputState } from '../core/input';
import type { Ability } from './ability';
import { DashAction } from './action';
import type { FighterAction } from './action';
import { Animator } from './animator';
import { createBody, moveX, moveY } from './body';
import type { Body } from './body';
import { normalize } from './combat';
import { SimEvent } from './events';
import { createMovementFlags, createMovementState, senseContacts, stepMovement } from './movement';
import type { MovementFlags, MovementState } from './movement';
import type { Trait } from './trait';
import { DEFAULT_MOVEMENT } from './tuning';
import type { MovementTuning } from './tuning';
import type { World } from './world';

export interface KunaiMark {
  clip: ClipDef;
  time: number;
  ownerId: number;
  angle: number;
  ox: number;
  oy: number;
}

export interface FighterInit {
  id: number;
  name: string;
  color: number;
  x: number;
  y: number;
  team: number;
  controller: Controller;
  clips: FighterClips;
  portrait: ClipDef;
  tuning?: MovementTuning;
  maxHealth?: number;
  owner?: Fighter | null;
  attacks?: (Ability | null)[];
  supports?: (Ability | null)[];
  traits?: Trait[];
  respawnDelay?: number | null;
  ghost?: boolean;
}

const PULL_SPEED = 700;
const PULL_STOP_DISTANCE = 18;
const HIT_FLASH = 0.08;
const HURT_TIME = 0.12;

export class Fighter {
  readonly id: number;
  readonly name: string;
  readonly team: number;
  readonly owner: Fighter | null;
  readonly controller: Controller;
  readonly clips: FighterClips;
  readonly portrait: ClipDef;
  readonly tuning: MovementTuning;
  readonly body: Body;
  readonly move: MovementState;
  readonly animator: Animator;
  readonly flags: MovementFlags = createMovementFlags();
  readonly attacks: (Ability | null)[];
  readonly supports: (Ability | null)[];
  readonly traits: Trait[];
  readonly abilities: Ability[];
  readonly ghost: boolean;
  readonly respawnDelay: number | null;
  color: number;
  tint: number;
  health: number;
  maxHealth: number;
  dead = false;
  dodgeCooldown = 0;
  instinctTime = 0;
  stunTime = 0;
  hurtTime = 0;
  hitFlash = 0;
  action: FighterAction | null = null;
  pull: { puller: Fighter; time: number } | null = null;
  kunaiMark: KunaiMark | null = null;
  lastInput: InputState = NO_INPUT;
  aimX = 0;
  aimY = 0;

  private spawnX: number;
  private spawnY: number;
  private respawnTimer = 0;
  private scheduled: { ticks: number; fn: () => void }[] = [];
  private overlay: ClipDef | null = null;
  private world: World | null = null;

  constructor(init: FighterInit) {
    this.id = init.id;
    this.name = init.name;
    this.team = init.team;
    this.owner = init.owner ?? null;
    this.color = init.color;
    this.tint = init.color;
    this.controller = init.controller;
    this.clips = init.clips;
    this.portrait = init.portrait;
    this.attacks = init.attacks ?? [];
    this.supports = init.supports ?? [];
    this.traits = init.traits ?? [];
    this.abilities = [...this.attacks, ...this.supports].filter((a): a is Ability => a !== null);
    this.ghost = init.ghost ?? false;
    this.respawnDelay = init.respawnDelay ?? null;
    let tuning = init.tuning ?? DEFAULT_MOVEMENT;
    for (const trait of this.traits) if (trait.modifyTuning) tuning = trait.modifyTuning(tuning);
    this.tuning = tuning;
    this.maxHealth = init.maxHealth ?? 100;
    this.health = this.maxHealth;
    this.spawnX = init.x;
    this.spawnY = init.y;
    this.body = createBody(init.x, init.y, this.tuning.bodyW, this.tuning.bodyH);
    this.move = createMovementState(this.tuning);
    this.animator = new Animator((name) => this.onAnimEvent(name));
    this.animator.play(this.clips.idle);
  }

  get alive(): boolean {
    return !this.dead;
  }

  get center(): { x: number; y: number } {
    return { x: this.body.x, y: this.body.y - this.body.h / 2 };
  }

  get invulnerable(): boolean {
    return this.action?.invulnerable ?? false;
  }

  get dodgeCooldownTime(): number {
    return this.instinctTime > 0 ? 1 : this.tuning.dodgeCooldown;
  }

  get dodgeReady(): number {
    return Math.min(1, Math.max(0, 1 - this.dodgeCooldown / this.dodgeCooldownTime));
  }

  aimDir(): { x: number; y: number } {
    const c = this.center;
    return normalize(this.aimX - c.x, this.aimY - c.y, this.move.facing, 0);
  }

  attach(world: World): void {
    this.world = world;
    senseContacts(world.arena, this.body, this.move, this.tuning);
  }

  schedule(ticks: number, fn: () => void): void {
    this.scheduled.push({ ticks, fn });
  }

  playOverlay(clip: ClipDef): void {
    this.overlay = clip;
    this.animator.play(clip, true);
  }

  startAction(action: FighterAction, world: World): void {
    this.cancelAction(world);
    this.action = action;
    action.start(this, world);
    if (action.clip) this.animator.play(action.clip, true);
  }

  cancelAction(world: World): void {
    const old = this.action;
    this.action = null;
    if (old) old.end(this, world);
  }

  dodge(world: World, dirX: number, dirY: number): void {
    const t = this.tuning;
    this.dodgeCooldown = this.dodgeCooldownTime;
    const c = this.center;
    world.emit({ type: SimEvent.Dodge, fighterId: this.id, x: c.x, y: c.y, dir: this.move.facing, power: t.dodgeSpeed, tint: this.tint });
    this.startAction(
      new DashAction({
        dirX,
        dirY,
        speed: t.dodgeSpeed,
        duration: t.dodgeDuration,
        exitFactor: t.dodgeExitFactor,
        clip: this.clips.run,
        invulnerable: true,
        trail: true,
        trailTicks: t.dodgeTrailTicks,
      }),
      world,
    );
  }

  dodgeAway(world: World, fromX: number, fromY: number): void {
    const c = this.center;
    const away = normalize(c.x - fromX, c.y - fromY, -this.move.facing, 0);
    this.dodge(world, away.x, away.y);
  }

  stun(time: number, world: World): void {
    this.stunTime = Math.max(this.stunTime, time);
    this.cancelAction(world);
  }

  applyDamage(world: World, amount: number, flash = true): void {
    this.health = Math.max(0, this.health - amount);
    if (flash) {
      this.hitFlash = HIT_FLASH;
      this.hurtTime = HURT_TIME;
    }
    if (this.health <= 0) this.die(world);
  }

  die(world: World): void {
    this.dead = true;
    this.health = 0;
    this.cancelAction(world);
    this.pull = null;
    this.kunaiMark = null;
    this.scheduled.length = 0;
    this.respawnTimer = this.respawnDelay ?? 0;
    const c = this.center;
    world.emit({ type: SimEvent.Death, fighterId: this.id, x: c.x, y: c.y, dir: this.move.facing, power: 0, tint: this.tint });
  }

  respawn(): void {
    const world = this.world;
    this.body.x = this.spawnX;
    this.body.y = this.spawnY;
    this.body.vx = 0;
    this.body.vy = 0;
    this.health = this.maxHealth;
    this.dead = false;
    this.dodgeCooldown = 0;
    this.instinctTime = 0;
    this.stunTime = 0;
    this.hurtTime = 0;
    this.hitFlash = 0;
    this.action = null;
    this.pull = null;
    this.kunaiMark = null;
    this.overlay = null;
    this.scheduled.length = 0;
    this.move.kickLock = 0;
    this.move.jumpBuffer = 0;
    this.move.facing = 1;
    this.move.cutImmune = false;
    for (const a of this.abilities) a.reset();
    for (const t of this.traits) t.reset?.();
    this.animator.play(this.clips.idle, true);
    if (world) {
      for (const f of world.fighters.slice()) if (f.owner === this) world.removeFighter(f);
      senseContacts(world.arena, this.body, this.move, this.tuning);
    }
  }

  step(world: World): void {
    const input = this.controller.read(this, world);
    this.lastInput = input;
    this.aimX = input.aimX;
    this.aimY = input.aimY;

    if (this.dead) {
      if (this.respawnDelay !== null) {
        this.respawnTimer -= SIM_DT;
        if (this.respawnTimer <= 0) this.respawn();
      }
      return;
    }

    this.tickTimers();

    if (this.stunTime > 0) {
      this.body.vx = 0;
      this.body.vy = 0;
      this.animator.step();
      return;
    }

    if (this.pull && this.stepPull(world)) return;

    for (const a of this.abilities) a.update(this, world, input);

    if (this.action) {
      const action = this.action;
      if (action.step(this, world, input)) {
        this.action = null;
        action.end(this, world);
      }
    }

    if (!this.action) this.triggerAbilities(world, input);

    if (this.action) {
      if (this.action.clip) this.animator.play(this.action.clip);
      this.animator.step();
      return;
    }

    stepMovement(world.arena, this.body, this.move, this.tuning, input, this.flags);
    this.emitMovementEvents(world);
    this.driveAnimation();
    this.animator.step();
  }

  private tickTimers(): void {
    this.dodgeCooldown = Math.max(0, this.dodgeCooldown - SIM_DT);
    this.instinctTime = Math.max(0, this.instinctTime - SIM_DT);
    this.stunTime = Math.max(0, this.stunTime - SIM_DT);
    this.hurtTime = Math.max(0, this.hurtTime - SIM_DT);
    this.hitFlash = Math.max(0, this.hitFlash - SIM_DT);
    for (const a of this.abilities) a.tickCooldown(SIM_DT);
    if (this.instinctTime > 0 && this.dodgeCooldown > 1) this.dodgeCooldown = 1;
    if (this.kunaiMark) {
      this.kunaiMark.time -= SIM_DT;
      if (this.kunaiMark.time <= 0) this.kunaiMark = null;
    }
    if (this.scheduled.length > 0) {
      const due: (() => void)[] = [];
      let w = 0;
      for (const s of this.scheduled) {
        s.ticks--;
        if (s.ticks <= 0) due.push(s.fn);
        else this.scheduled[w++] = s;
      }
      this.scheduled.length = w;
      for (const fn of due) fn();
    }
  }

  private triggerAbilities(world: World, input: InputState): void {
    if (isPressed(input, Action.Dodge) && this.dodgeCooldown === 0) {
      const d = this.aimDir();
      this.dodge(world, d.x, d.y);
      return;
    }
    for (let i = 0; i < this.attacks.length; i++) {
      const a = this.attacks[i];
      if (a && isPressed(input, SLOT_ACTIONS[i]) && a.canUse(this, world)) {
        a.use(this, world);
        if (this.action) return;
      }
    }
    for (let i = 0; i < this.supports.length; i++) {
      const a = this.supports[i];
      if (a && isPressed(input, SUPPORT_ACTIONS[i]) && a.canUse(this, world)) {
        a.use(this, world);
        if (this.action) return;
      }
    }
  }

  private stepPull(world: World): boolean {
    const pull = this.pull;
    if (!pull) return false;
    pull.time -= SIM_DT;
    const c = this.center;
    const p = pull.puller.center;
    const dx = p.x - c.x;
    const dy = p.y - c.y;
    const dist = Math.hypot(dx, dy);
    if (!pull.puller.alive || pull.time <= 0 || dist < PULL_STOP_DISTANCE) {
      this.pull = null;
      this.body.vx = 0;
      this.body.vy = 0;
      return false;
    }
    this.cancelAction(world);
    const b = this.body;
    b.vx = (dx / dist) * PULL_SPEED;
    b.vy = (dy / dist) * PULL_SPEED;
    moveX(world.arena, b, b.vx * SIM_DT);
    moveY(world.arena, b, b.vy * SIM_DT);
    senseContacts(world.arena, b, this.move, this.tuning);
    this.animator.play(this.clips.fall);
    this.animator.step();
    return true;
  }

  private emitMovementEvents(world: World): void {
    const f = this.flags;
    const b = this.body;
    const base = { fighterId: this.id, dir: this.move.facing, tint: this.tint };
    if (f.jumped) world.emit({ ...base, type: SimEvent.Jump, x: b.x, y: b.y, power: 1 });
    if (f.airJumped) world.emit({ ...base, type: SimEvent.AirJump, x: b.x, y: b.y, power: 1 });
    if (f.wallKicked) world.emit({ ...base, type: SimEvent.WallKick, x: b.x, y: b.y - b.h * 0.4, dir: f.kickDir, power: 1 });
    if (f.landed) world.emit({ ...base, type: SimEvent.Land, x: b.x, y: b.y, power: f.landSpeed });
  }

  private onAnimEvent(name: string): void {
    if (!this.world || this.action || name !== SimEvent.Step) return;
    const b = this.body;
    this.world.emit({
      type: SimEvent.Step,
      fighterId: this.id,
      x: b.x,
      y: b.y,
      dir: this.move.facing,
      power: Math.abs(b.vx),
      tint: this.tint,
    });
  }

  private driveAnimation(): void {
    const a = this.animator;
    const c = this.clips;
    const s = this.move;
    const b = this.body;
    const f = this.flags;
    const t = this.tuning;

    if (this.hurtTime > 0 && c.hurt) return a.play(c.hurt);

    if (f.wallKicked) return a.play(c.wallKick, true);
    if (f.airJumped) return a.play(c.doubleJump, true);
    if (f.jumped) return a.play(c.jumpStart, true);
    if (f.landed) return a.play(c.land, true);

    if (this.overlay) {
      if (a.clip === this.overlay && !a.finished) return;
      this.overlay = null;
    }

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
