import { Action, SUPPORT_MASK } from '../core/input';
import type { Controller } from '../core/controller';
import type { InputState } from '../core/input';
import type { Fighter } from './fighter';

function swapSides(mask: number): number {
  let out = mask & ~(Action.Left | Action.Right);
  if ((mask & Action.Left) !== 0) out |= Action.Right;
  if ((mask & Action.Right) !== 0) out |= Action.Left;
  return out;
}

export class MirrorController implements Controller {
  constructor(private owner: Fighter) {}

  read(self: Fighter): InputState {
    const o = this.owner.lastInput;
    const oc = this.owner.center;
    const sc = self.center;
    return {
      held: swapSides(o.held) & ~SUPPORT_MASK,
      pressed: swapSides(o.pressed) & ~SUPPORT_MASK,
      aimX: sc.x + (o.aimX - oc.x),
      aimY: sc.y + (o.aimY - oc.y),
    };
  }
}

export class IdleController implements Controller {
  read(): InputState {
    return { held: 0, pressed: 0, aimX: 0, aimY: 0 };
  }
}
