import { SimEvent } from '../../sim/events';
import type { Fighter } from '../../sim/fighter';
import { senseContacts } from '../../sim/movement';
import type { Trait } from '../../sim/trait';
import type { MovementTuning } from '../../sim/tuning';
import type { World } from '../../sim/world';

export const TRAIT_TUNING = {
  quickfoot: { speedMul: 1.15 },
  rapid: { restore: 0.2 },
  escapist: { threshold: 0.3, stun: 0.25, gridStep: 12 },
};

export class Quickfoot implements Trait {
  readonly id = 'quickfoot';
  readonly name = 'Quickfoot';

  modifyTuning(t: MovementTuning): MovementTuning {
    const m = TRAIT_TUNING.quickfoot.speedMul;
    return { ...t, runSpeed: t.runSpeed * m, groundAccel: t.groundAccel * m, airAccel: t.airAccel * m };
  }
}

export class Rapid implements Trait {
  readonly id = 'rapid';
  readonly name = 'Rapid';

  onHit(owner: Fighter, _world: World, _target: Fighter, _amount: number, kind: string): void {
    if (kind !== 'attack') return;
    owner.dodgeCooldown = Math.max(0, owner.dodgeCooldown - TRAIT_TUNING.rapid.restore);
  }
}

export class Escapist implements Trait {
  readonly id = 'escapist';
  readonly name = 'Escapist';
  private used = false;

  reset(): void {
    this.used = false;
  }

  onDamaged(f: Fighter, w: World): void {
    const t = TRAIT_TUNING.escapist;
    if (this.used || f.health / f.maxHealth >= t.threshold) return;
    this.used = true;

    const foes = w.enemiesOf(f);
    const origin = f.center;
    w.emit({ type: SimEvent.FlashBomb, fighterId: f.id, x: origin.x, y: origin.y, dir: 1, power: 0, tint: f.tint });

    const near = w.nearestEnemy(f);
    const spot = this.findSpot(f, w, near ? near.center : origin);
    f.cancelAction(w);
    f.body.x = spot.x;
    f.body.y = spot.y;
    f.body.vx = 0;
    f.body.vy = 0;
    senseContacts(w.arena, f.body, f.move, f.tuning);
    const arrival = f.center;
    w.emit({ type: SimEvent.Smoke, fighterId: f.id, x: arrival.x, y: arrival.y, dir: 1, power: 0, tint: f.tint });

    for (const e of foes) e.stun(t.stun, w);
  }

  private findSpot(f: Fighter, w: World, ref: { x: number; y: number }): { x: number; y: number } {
    const arena = w.arena;
    const hw = f.body.w / 2;
    const h = f.body.h;
    let best = { x: f.body.x, y: f.body.y };
    let bestScore = -1;
    for (let x = arena.innerLeft + hw + 2; x <= arena.innerRight - hw - 2; x += TRAIT_TUNING.escapist.gridStep) {
      for (const y of [arena.floorY, arena.floorY - 48, arena.floorY - 96]) {
        if (arena.solidInRect(x - hw, y - h, x + hw, y)) continue;
        const score = Math.hypot(x - ref.x, y - h / 2 - ref.y) + w.rng.next() * 6;
        if (score > bestScore) {
          bestScore = score;
          best = { x, y };
        }
      }
    }
    return best;
  }
}
