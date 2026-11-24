import { SIM_DT } from '../config';
import type { ClipDef } from '../content/clips';
import type { InputState } from '../core/input';
import { directionAngle } from './dodge';
import { moveX, moveY } from './body';
import { SimEvent } from './events';
import type { Fighter } from './fighter';
import { senseContacts } from './movement';
import type { World } from './world';

export type PoseMode = 'normal' | 'rotated' | 'centered';

export interface FighterAction {
  readonly pose: PoseMode;
  readonly invulnerable: boolean;
  readonly clip: ClipDef | null;
  readonly angle: number;
  readonly flip: boolean;
  start(fighter: Fighter, world: World): void;
  step(fighter: Fighter, world: World, input: InputState): boolean;
  end(fighter: Fighter, world: World): void;
}

export interface DashOptions {
  dirX: number;
  dirY: number;
  speed: number;
  duration: number;
  exitFactor: number;
  clip: ClipDef | null;
  invulnerable: boolean;
  trail: boolean;
  trailTicks?: number;
  stopOnGround?: boolean;
  onStart?(fighter: Fighter, world: World, dash: DashAction): void;
  onStep?(fighter: Fighter, world: World, dash: DashAction): boolean | void;
  onEnd?(fighter: Fighter, world: World, dash: DashAction): void;
}

export class DashAction implements FighterAction {
  readonly pose: PoseMode = 'rotated';
  readonly angle: number;
  readonly flip: boolean;
  readonly hit = new Set<Fighter>();
  time: number;
  ticks = 0;

  constructor(readonly opts: DashOptions) {
    const d = directionAngle(opts.dirX, opts.dirY);
    this.angle = d.angle;
    this.flip = d.flip;
    this.time = opts.duration;
  }

  get clip(): ClipDef | null {
    return this.opts.clip;
  }

  get invulnerable(): boolean {
    return this.opts.invulnerable;
  }

  start(f: Fighter, w: World): void {
    if (Math.abs(this.opts.dirX) > 0.2) f.move.facing = this.opts.dirX > 0 ? 1 : -1;
    f.move.kickLock = 0;
    f.move.jumpBuffer = 0;
    f.move.sliding = false;
    f.move.cutImmune = false;
    this.opts.onStart?.(f, w, this);
  }

  step(f: Fighter, w: World, _input?: InputState): boolean {
    const o = this.opts;
    const b = f.body;
    const px = b.x;
    const py = b.y;
    b.vx = o.dirX * o.speed;
    b.vy = o.dirY * o.speed;
    moveX(w.arena, b, b.vx * SIM_DT);
    moveY(w.arena, b, b.vy * SIM_DT);
    senseContacts(w.arena, b, f.move, f.tuning);

    const every = o.trailTicks ?? f.tuning.dodgeTrailTicks;
    if (o.trail && this.ticks % every === 0) {
      w.emit({
        type: SimEvent.DodgeTrail,
        fighterId: f.id,
        x: b.x,
        y: b.y - b.h / 2,
        dir: this.flip ? -1 : 1,
        power: 0,
        tint: f.tint,
        angle: this.angle,
        index: this.ticks / every,
        clip: o.clip ?? f.clips.run,
      });
    }
    this.ticks++;

    const stop = o.onStep?.(f, w, this) === true;
    this.time -= SIM_DT;
    const blocked = Math.hypot(b.x - px, b.y - py) < o.speed * SIM_DT * 0.25;
    const grounded = o.stopOnGround === true && f.move.grounded && this.ticks > 2;
    return this.time <= 0 || blocked || grounded || stop;
  }

  end(f: Fighter, w: World): void {
    const o = this.opts;
    f.body.vx = o.dirX * o.speed * o.exitFactor;
    f.body.vy = o.dirY * o.speed * o.exitFactor;
    o.onEnd?.(f, w, this);
  }
}
