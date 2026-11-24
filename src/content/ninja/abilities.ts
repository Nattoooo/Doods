import { SIM_DT } from '../../config';
import { approach } from '../../core/math';
import { Action, axisX, isHeld } from '../../core/input';
import type { InputState } from '../../core/input';
import { Ability } from '../../sim/ability';
import { DashAction } from '../../sim/action';
import type { FighterAction, PoseMode } from '../../sim/action';
import { moveX, moveY } from '../../sim/body';
import { bodyBox, boxAround, boxesOverlap, circleOverlapsBox, freeDistance, normalize } from '../../sim/combat';
import type { ClipDef } from '../clips';
import { SimEvent } from '../../sim/events';
import type { Fighter } from '../../sim/fighter';
import { senseContacts } from '../../sim/movement';
import type { World } from '../../sim/world';
import { NINJA_CLIPS } from './clips';
import { Katana, Kunai, Shuriken } from './projectiles';

export const ABILITY_TUNING = {
  releaseTicks: 8,
  chop: { cooldown: 1, damage: 7, speed: 700, duration: 0.12, exitFactor: 0.2, reach: 10, half: 13 },
  shuriken: { cooldown: 4, spread: 0.14 },
  katana: { cooldown: 7 },
  kunai: { cooldown: 10 },
  ambush: {
    cooldown: 10,
    dodges: 3,
    dodgeSpeed: 960,
    dodgeDuration: 0.13,
    gap: 0.04,
    strikeGap: 0.05,
    strikeSpeed: 1300,
    strikeDuration: 0.22,
    damage: 15,
    half: 10,
  },
  pin: { cooldown: 5, launchSpeed: 520, window: 2.5, diveSpeed: 900, diveDuration: 0.8, damage: 10, minDown: 0.35, half: 11 },
  heli: { cooldown: 8, duration: 3, flySpeed: 170, accel: 1800, dps: 7, tick: 0.1, radius: 22 },
  instinct: { cooldown: 15, duration: 5 },
  illusion: { cooldown: 20 },
};

function strike(f: Fighter, w: World, dash: DashAction, box: ReturnType<typeof boxAround>, damage: number): boolean {
  let landed = false;
  for (const e of w.enemiesOf(f)) {
    if (dash.hit.has(e)) continue;
    if (!boxesOverlap(box, bodyBox(e))) continue;
    dash.hit.add(e);
    if (w.damage(f, e, damage, { kind: 'attack' })) landed = true;
  }
  return landed;
}

export class Chop extends Ability {
  constructor() {
    super('chop', 'Chop', ABILITY_TUNING.chop.cooldown);
  }

  use(f: Fighter, w: World): void {
    const t = ABILITY_TUNING.chop;
    const aim = f.aimDir();
    this.cooldown = this.cooldownTime;
    f.startAction(
      new DashAction({
        dirX: aim.x,
        dirY: aim.y,
        speed: t.speed,
        duration: t.duration,
        exitFactor: t.exitFactor,
        clip: NINJA_CLIPS.chop,
        invulnerable: false,
        trail: true,
        trailTicks: 3,
        onStart: (fighter, world, dash) => {
          const c = fighter.center;
          world.emit({
            type: SimEvent.Slash,
            fighterId: fighter.id,
            x: c.x + aim.x * 8,
            y: c.y + aim.y * 8,
            dir: dash.flip ? -1 : 1,
            power: 0,
            tint: fighter.tint,
            angle: dash.angle,
          });
        },
        onStep: (fighter, world, dash) => {
          const c = fighter.center;
          strike(fighter, world, dash, boxAround(c.x + aim.x * t.reach, c.y + aim.y * t.reach, t.half, t.half), t.damage);
        },
      }),
      w,
    );
  }
}

export class ShurikenTrio extends Ability {
  constructor() {
    super('shuriken', 'Shuriken Trio', ABILITY_TUNING.shuriken.cooldown);
  }

  use(f: Fighter, w: World): void {
    this.cooldown = this.cooldownTime;
    f.playOverlay(NINJA_CLIPS.throw);
    f.schedule(ABILITY_TUNING.releaseTicks, () => {
      if (!f.alive) return;
      const d = f.aimDir();
      const c = f.center;
      const base = Math.atan2(d.y, d.x);
      for (const off of [-ABILITY_TUNING.shuriken.spread, 0, ABILITY_TUNING.shuriken.spread]) {
        w.addProjectile(new Shuriken(f, c.x + d.x * 8, c.y + d.y * 8, base + off));
      }
    });
  }
}

export class KatanaThrow extends Ability {
  constructor() {
    super('katana', 'Katana Throw', ABILITY_TUNING.katana.cooldown);
  }

  use(f: Fighter, w: World): void {
    this.cooldown = this.cooldownTime;
    f.playOverlay(NINJA_CLIPS.throw);
    f.schedule(ABILITY_TUNING.releaseTicks, () => {
      if (!f.alive) return;
      const d = f.aimDir();
      const c = f.center;
      w.addProjectile(new Katana(f, c.x + d.x * 10, c.y + d.y * 10, Math.atan2(d.y, d.x)));
    });
  }
}

export class TrackingKunai extends Ability {
  constructor() {
    super('kunai', 'Tracking Kunai', ABILITY_TUNING.kunai.cooldown);
  }

  use(f: Fighter, w: World): void {
    this.cooldown = this.cooldownTime;
    f.playOverlay(NINJA_CLIPS.throw);
    f.schedule(ABILITY_TUNING.releaseTicks, () => {
      if (!f.alive) return;
      const d = f.aimDir();
      const c = f.center;
      w.addProjectile(new Kunai(f, c.x + d.x * 8, c.y + d.y * 8, Math.atan2(d.y, d.x)));
    });
  }
}

class AmbushAction implements FighterAction {
  readonly pose: PoseMode = 'rotated';
  private phase = 0;
  private gap = 0;
  private current: DashAction | null = null;

  get clip(): ClipDef | null {
    return this.current?.clip ?? NINJA_CLIPS.run;
  }

  get angle(): number {
    return this.current?.angle ?? 0;
  }

  get flip(): boolean {
    return this.current?.flip ?? false;
  }

  get invulnerable(): boolean {
    return this.phase < ABILITY_TUNING.ambush.dodges || this.gap > 0;
  }

  start(f: Fighter, w: World): void {
    this.begin(f, w);
  }

  step(f: Fighter, w: World, input: InputState): boolean {
    const t = ABILITY_TUNING.ambush;
    if (this.gap > 0) {
      this.gap -= SIM_DT;
      f.body.vx = 0;
      f.body.vy = 0;
      if (this.gap <= 0) this.begin(f, w);
      return false;
    }
    const cur = this.current;
    if (!cur) return true;
    if (!cur.step(f, w, input)) return false;
    cur.end(f, w);
    this.phase++;
    if (this.phase > t.dodges) return true;
    this.gap = this.phase === t.dodges ? t.strikeGap : t.gap;
    f.body.vx = 0;
    f.body.vy = 0;
    return false;
  }

  end(f: Fighter): void {
    f.body.vx *= 0.2;
    f.body.vy *= 0.2;
  }

  private begin(f: Fighter, w: World): void {
    const t = ABILITY_TUNING.ambush;
    let dash: DashAction;
    if (this.phase < t.dodges) {
      const dir = this.randomDirection(f, w);
      dash = new DashAction({
        dirX: dir.x,
        dirY: dir.y,
        speed: t.dodgeSpeed,
        duration: t.dodgeDuration,
        exitFactor: 0,
        clip: f.clips.run,
        invulnerable: true,
        trail: true,
      });
    } else {
      const foe = w.nearestEnemy(f);
      const c = f.center;
      const target = foe ? foe.center : { x: f.aimX, y: f.aimY };
      const dir = normalize(target.x - c.x, target.y - c.y, f.move.facing, 0);
      dash = new DashAction({
        dirX: dir.x,
        dirY: dir.y,
        speed: t.strikeSpeed,
        duration: t.strikeDuration,
        exitFactor: 0.1,
        clip: NINJA_CLIPS.stab,
        invulnerable: false,
        trail: true,
        trailTicks: 2,
        onStep: (fighter, world, d) => {
          const p = fighter.center;
          return strike(fighter, world, d, boxAround(p.x, p.y, t.half, t.half), t.damage);
        },
      });
    }
    this.current = dash;
    dash.start(f, w);
  }

  private randomDirection(f: Fighter, w: World): { x: number; y: number } {
    const t = ABILITY_TUNING.ambush;
    const need = t.dodgeSpeed * t.dodgeDuration * 0.6;
    const open: { x: number; y: number }[] = [];
    let best = { x: 1, y: 0 };
    let bestFree = -1;
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2;
      const dir = { x: Math.cos(a), y: Math.sin(a) };
      const free = freeDistance(w.arena, f.body, dir.x, dir.y, need);
      if (free >= need) open.push(dir);
      if (free > bestFree) {
        bestFree = free;
        best = dir;
      }
    }
    return open.length > 0 ? w.rng.pick(open) : best;
  }
}

export class Ambush extends Ability {
  constructor() {
    super('ambush', 'Ambush', ABILITY_TUNING.ambush.cooldown);
  }

  use(f: Fighter, w: World): void {
    this.cooldown = this.cooldownTime;
    f.startAction(new AmbushAction(), w);
  }
}

export class Pin extends Ability {
  private phase: 'idle' | 'air' | 'dive' = 'idle';
  private timer = 0;
  private airTime = 0;

  constructor() {
    super('pin', 'Pin', ABILITY_TUNING.pin.cooldown);
  }

  get active(): boolean {
    return this.phase !== 'idle';
  }

  canUse(f: Fighter): boolean {
    if (this.phase === 'air') return !f.action;
    return this.phase === 'idle' && this.cooldown === 0;
  }

  reset(): void {
    super.reset();
    this.phase = 'idle';
  }

  update(f: Fighter): void {
    if (this.phase !== 'air') return;
    this.timer -= SIM_DT;
    this.airTime += SIM_DT;
    if ((f.move.grounded && this.airTime > 0.15) || this.timer <= 0) this.finish();
  }

  use(f: Fighter, w: World): void {
    if (this.phase === 'idle') this.launch(f, w);
    else this.dive(f, w);
  }

  private finish(): void {
    this.phase = 'idle';
    this.cooldown = this.cooldownTime;
  }

  private launch(f: Fighter, w: World): void {
    const t = ABILITY_TUNING.pin;
    f.body.vy = -t.launchSpeed;
    f.move.grounded = false;
    f.move.coyote = 0;
    f.move.jumpBuffer = 0;
    f.move.cutImmune = true;
    this.phase = 'air';
    this.timer = t.window;
    this.airTime = 0;
    w.emit({ type: SimEvent.Jump, fighterId: f.id, x: f.body.x, y: f.body.y, dir: f.move.facing, power: 1, tint: f.tint });
  }

  private dive(f: Fighter, w: World): void {
    const t = ABILITY_TUNING.pin;
    const aim = f.aimDir();
    let dx = aim.x;
    let dy = aim.y;
    if (dy < t.minDown) {
      dy = t.minDown;
      dx = (dx < 0 ? -1 : dx > 0 ? 1 : f.move.facing) * Math.sqrt(1 - dy * dy);
    }
    this.phase = 'dive';
    f.startAction(
      new DashAction({
        dirX: dx,
        dirY: dy,
        speed: t.diveSpeed,
        duration: t.diveDuration,
        exitFactor: 0,
        clip: NINJA_CLIPS.stab,
        invulnerable: false,
        trail: true,
        trailTicks: 2,
        stopOnGround: true,
        onStep: (fighter, world, dash) => {
          const c = fighter.center;
          strike(fighter, world, dash, boxAround(c.x, c.y, t.half, t.half), t.damage);
        },
        onEnd: () => this.finish(),
      }),
      w,
    );
  }
}

class HeliAction implements FighterAction {
  readonly pose: PoseMode = 'centered';
  readonly invulnerable = false;
  readonly clip = NINJA_CLIPS.heli;
  readonly angle = 0;
  readonly flip = false;
  private time = ABILITY_TUNING.heli.duration;
  private hitTimer = 0;

  constructor(private ability: Helichopter) {}

  start(f: Fighter): void {
    f.move.sliding = false;
    f.move.cutImmune = false;
    f.move.jumpBuffer = 0;
  }

  step(f: Fighter, w: World, input: InputState): boolean {
    const t = ABILITY_TUNING.heli;
    const b = f.body;
    const ax = axisX(input);
    const ay = (isHeld(input, Action.Down) ? 1 : 0) - (isHeld(input, Action.Up) ? 1 : 0);
    const len = Math.hypot(ax, ay) || 1;
    b.vx = approach(b.vx, (ax / len) * t.flySpeed, t.accel * SIM_DT);
    b.vy = approach(b.vy, (ay / len) * t.flySpeed, t.accel * SIM_DT);
    if (moveX(w.arena, b, b.vx * SIM_DT)) b.vx = 0;
    if (moveY(w.arena, b, b.vy * SIM_DT) !== 0) b.vy = 0;
    senseContacts(w.arena, b, f.move, f.tuning);
    if (ax !== 0) f.move.facing = ax;

    this.hitTimer -= SIM_DT;
    if (this.hitTimer <= 0) {
      this.hitTimer = t.tick;
      const c = f.center;
      for (const e of w.enemiesOf(f)) {
        if (circleOverlapsBox(c.x, c.y, t.radius, bodyBox(e))) w.damage(f, e, t.dps * t.tick, { kind: 'dot' });
      }
    }

    this.time -= SIM_DT;
    return this.time <= 0;
  }

  end(f: Fighter): void {
    f.body.vx *= 0.5;
    f.body.vy *= 0.5;
    this.ability.finish();
  }
}

export class Helichopter extends Ability {
  private running = false;

  constructor() {
    super('helichopter', 'Helichopter', ABILITY_TUNING.heli.cooldown);
  }

  get active(): boolean {
    return this.running;
  }

  reset(): void {
    super.reset();
    this.running = false;
  }

  use(f: Fighter, w: World): void {
    this.running = true;
    f.startAction(new HeliAction(this), w);
  }

  finish(): void {
    this.running = false;
    this.cooldown = this.cooldownTime;
  }
}

export class Instinct extends Ability {
  private running = false;

  constructor() {
    super('instinct', 'Instinct', ABILITY_TUNING.instinct.cooldown);
  }

  get active(): boolean {
    return this.running;
  }

  reset(): void {
    super.reset();
    this.running = false;
  }

  use(f: Fighter): void {
    this.running = true;
    f.instinctTime = ABILITY_TUNING.instinct.duration;
    f.dodgeCooldown = Math.min(f.dodgeCooldown, 1);
  }

  update(f: Fighter): void {
    if (this.running && f.instinctTime <= 0) {
      this.running = false;
      this.cooldown = this.cooldownTime;
    }
  }
}

export type CloneFactory = (owner: Fighter, world: World) => Fighter;

export class Illusion extends Ability {
  private clone: Fighter | null = null;

  constructor(private factory: CloneFactory) {
    super('illusion', 'Illusion', ABILITY_TUNING.illusion.cooldown);
  }

  get active(): boolean {
    return this.clone !== null;
  }

  reset(): void {
    super.reset();
    this.clone = null;
  }

  use(f: Fighter, w: World): void {
    const clone = this.factory(f, w);
    this.clone = clone;
    w.addFighter(clone);
    const c = clone.center;
    w.emit({ type: SimEvent.Smoke, fighterId: clone.id, x: c.x, y: c.y, dir: 1, power: 0, tint: clone.tint });
  }

  update(_f: Fighter, w: World): void {
    const clone = this.clone;
    if (!clone || clone.alive) return;
    const c = clone.center;
    w.emit({ type: SimEvent.Smoke, fighterId: clone.id, x: c.x, y: c.y, dir: 1, power: 0, tint: clone.tint });
    w.removeFighter(clone);
    this.clone = null;
    this.cooldown = this.cooldownTime;
  }
}
