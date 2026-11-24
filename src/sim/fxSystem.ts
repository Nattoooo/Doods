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
  animator: Animator;
}

const HARD_LANDING_SPEED = 220;

export class FxSystem {
  readonly instances: FxInstance[] = [];

  constructor(world: World) {
    world.events.on((e) => this.handle(e));
  }

  spawn(clip: ClipDef, x: number, y: number, flip: boolean, tint: number): void {
    const animator = new Animator();
    animator.play(clip);
    this.instances.push({ clip, x, y, flip, tint, animator });
  }

  step(_world: World): void {
    let w = 0;
    for (let i = 0; i < this.instances.length; i++) {
      const fx = this.instances[i];
      fx.animator.step();
      if (!fx.animator.finished) this.instances[w++] = fx;
    }
    this.instances.length = w;
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
    }
  }
}
