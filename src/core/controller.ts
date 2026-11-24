import type { Fighter } from '../sim/fighter';
import type { World } from '../sim/world';
import type { InputState } from './input';

export interface Controller {
  read(self: Fighter, world: World): InputState;
}
