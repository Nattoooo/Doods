import type { InputState } from '../core/input';
import type { Fighter } from './fighter';
import type { World } from './world';

export abstract class Ability {
  cooldown = 0;

  constructor(
    readonly id: string,
    readonly name: string,
    readonly cooldownTime: number,
  ) {}

  get active(): boolean {
    return false;
  }

  get cooldownRatio(): number {
    return this.cooldownTime > 0 ? this.cooldown / this.cooldownTime : 0;
  }

  canUse(_fighter: Fighter, _world: World): boolean {
    return this.cooldown === 0 && !this.active;
  }

  tickCooldown(dt: number): void {
    if (this.cooldown > 0) this.cooldown = Math.max(0, this.cooldown - dt);
  }

  update(_fighter: Fighter, _world: World, _input: InputState): void {}

  reset(): void {
    this.cooldown = 0;
  }

  abstract use(fighter: Fighter, world: World): void;
}
