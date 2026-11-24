import { SIM_DT } from '../config';
import type { ClipDef } from '../content/clips';
import { bodyBox, circleOverlapsBox } from './combat';
import type { Fighter } from './fighter';
import type { World } from './world';

export interface SweepResult {
  wall: boolean;
  hit: Fighter | null;
}

export abstract class Projectile {
  alive = true;
  age = 0;

  constructor(
    readonly owner: Fighter,
    public x: number,
    public y: number,
    public vx: number,
    public vy: number,
    readonly clip: ClipDef,
    readonly radius: number,
  ) {}

  abstract step(world: World): void;

  get angle(): number {
    return Math.atan2(this.vy, this.vx);
  }

  get frame(): number {
    return 0;
  }

  protected sweep(world: World): SweepResult {
    const dist = Math.hypot(this.vx, this.vy) * SIM_DT;
    const steps = Math.max(1, Math.ceil(dist / 2.5));
    const sx = (this.vx * SIM_DT) / steps;
    const sy = (this.vy * SIM_DT) / steps;
    const r = this.radius;
    const enemies = world.enemiesOf(this.owner);
    for (let i = 0; i < steps; i++) {
      this.x += sx;
      this.y += sy;
      if (world.arena.solidInRect(this.x - r, this.y - r, this.x + r, this.y + r)) return { wall: true, hit: null };
      for (const e of enemies) {
        if (e.invulnerable) continue;
        if (circleOverlapsBox(this.x, this.y, r, bodyBox(e))) return { wall: false, hit: e };
      }
    }
    return { wall: false, hit: null };
  }
}
