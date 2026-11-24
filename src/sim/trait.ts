import type { Fighter } from './fighter';
import type { MovementTuning } from './tuning';
import type { World } from './world';

export interface Trait {
  readonly id: string;
  readonly name: string;
  modifyTuning?(tuning: MovementTuning): MovementTuning;
  onHit?(owner: Fighter, world: World, target: Fighter, amount: number, kind: string): void;
  onDamaged?(owner: Fighter, world: World, amount: number): void;
  reset?(): void;
}
