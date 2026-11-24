import { FX_CLIPS } from '../content/fx';
import type { ClipDef } from '../content/clips';
import { Animator } from './animator';
import { SimEvent } from './events';
import type { SimEventData } from './events';
import type { World } from './world';

export interface FxInstance {
  clip: ClipDef;
  x: number;
  y: number;
  flip: boolean;
  tint: number;
  angle?: number;
  front: boolean;
  animator: Animator;
}

export interface GhostInstance {
  clip: ClipDef;
  frame: number;
  angle: number;
  x: number;
  y: number;
  flip: boolean;
  tint: number;
  age: number;
  life: number;
  alpha: number;
}

const HARD_LANDING_SPEED = 220;
const GHOST_LIFE = 20;
const GHOST_ALPHA = 0.6;

export class FxSystem {
  readonly instances: FxInstance[] = [];
  readonly ghosts: GhostInstance[] = [];

  constructor(world: World) {
    world.events.on((e) => this.handle(e));
  }

  spawn(clip: ClipDef, x: number, y: number, flip: boolean, tint: number, front = false, angle?: number): void {
    const animator = new Animator();
    animator.play(clip);
    this.instances.push({ clip, x, y, flip, tint, angle, front, animator });
  }

  step(_world: World): void {
    let w = 0;
    for (let i = 0; i < this.instances.length; i++) {
      const fx = this.instances[i];
      fx.animator.step();
      if (!fx.animator.finished) this.instances[w++] = fx;
    }
    this.instances.length = w;

    let g = 0;
    for (let i = 0; i < this.ghosts.length; i++) {
      const ghost = this.ghosts[i];
      ghost.age++;
      if (ghost.age >= ghost.life) continue;
      ghost.alpha = GHOST_ALPHA * (1 - ghost.age / ghost.life);
      this.ghosts[g++] = ghost;
    }
    this.ghosts.length = g;
  }

  private spawnTrail(e: SimEventData): void {
    const clip = e.clip;
    if (!clip) return;
    this.ghosts.push({
      clip,
      frame: (e.index ?? 0) % clip.frames,
      angle: e.angle ?? 0,
      x: e.x,
      y: e.y,
      flip: e.dir < 0,
      tint: e.tint,
      age: 0,
      life: GHOST_LIFE,
      alpha: GHOST_ALPHA,
    });
  }

  private handle(e: SimEventData): void {
    switch (e.type) {
      case SimEvent.Step:
        this.spawn(FX_CLIPS.stepDust, e.x - e.dir * 3, e.y, e.dir < 0, e.tint);
        break;
      case SimEvent.Jump:
        this.spawn(FX_CLIPS.jumpPuff, e.x, e.y, false, e.tint);
        break;
      case SimEvent.Land:
        if (e.power >= HARD_LANDING_SPEED) this.spawn(FX_CLIPS.landDust, e.x, e.y, false, e.tint);
        else this.spawn(FX_CLIPS.stepDust, e.x, e.y, e.dir < 0, e.tint);
        break;
      case SimEvent.AirJump:
        this.spawn(FX_CLIPS.airPuff, e.x, e.y, false, e.tint);
        break;
      case SimEvent.WallKick:
        this.spawn(FX_CLIPS.wallPuff, e.x - e.dir * 4, e.y, e.dir < 0, e.tint);
        break;
      case SimEvent.DodgeTrail:
        this.spawnTrail(e);
        break;
      case SimEvent.Hit:
        if (e.kind !== 'dot') this.spawn(FX_CLIPS.hit, e.x, e.y, false, e.tint, true);
        break;
      case SimEvent.Slash:
        this.spawn(FX_CLIPS.slash, e.x, e.y, e.dir < 0, e.tint, true, e.angle ?? 0);
        break;
      case SimEvent.FlashBomb:
        this.spawn(FX_CLIPS.flashBomb, e.x, e.y, false, e.tint, true);
        break;
      case SimEvent.Smoke:
      case SimEvent.Death:
        this.spawn(FX_CLIPS.smoke, e.x, e.y, false, e.tint, true);
        break;
    }
  }
}
