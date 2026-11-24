import { Emitter } from '../core/emitter';
import type { Arena } from './arena';
import type { SimEventData } from './events';
import { SimEvent } from './events';
import type { Fighter } from './fighter';
import type { Projectile } from './projectile';
import { Rng } from './rng';

export interface Updatable {
  step(world: World): void;
}

export interface DamageOptions {
  kind?: string;
  fromX?: number;
  fromY?: number;
  dodgeDirX?: number;
  dodgeDirY?: number;
}

export class World {
  readonly fighters: Fighter[] = [];
  readonly projectiles: Projectile[] = [];
  readonly systems: Updatable[] = [];
  readonly events = new Emitter<SimEventData>();
  readonly rng = new Rng(0x5eed);
  tick = 0;
  private idCounter = 0;

  constructor(readonly arena: Arena) {}

  nextId(): number {
    return this.idCounter++;
  }

  addFighter(fighter: Fighter): Fighter {
    this.fighters.push(fighter);
    fighter.attach(this);
    return fighter;
  }

  removeFighter(fighter: Fighter): void {
    const i = this.fighters.indexOf(fighter);
    if (i >= 0) this.fighters.splice(i, 1);
  }

  getFighter(id: number): Fighter | undefined {
    return this.fighters.find((f) => f.id === id);
  }

  addProjectile(projectile: Projectile): void {
    this.projectiles.push(projectile);
  }

  addSystem(system: Updatable): void {
    this.systems.push(system);
  }

  enemiesOf(fighter: Fighter): Fighter[] {
    return this.fighters.filter((o) => o.alive && o.team !== fighter.team);
  }

  nearestEnemy(fighter: Fighter): Fighter | null {
    const c = fighter.center;
    let best: Fighter | null = null;
    let bestD = Infinity;
    for (const e of this.enemiesOf(fighter)) {
      const ec = e.center;
      const d = (ec.x - c.x) ** 2 + (ec.y - c.y) ** 2;
      if (d < bestD) {
        bestD = d;
        best = e;
      }
    }
    return best;
  }

  emit(event: SimEventData): void {
    this.events.emit(event);
  }

  damage(attacker: Fighter | null, target: Fighter, amount: number, options: DamageOptions = {}): boolean {
    if (!target.alive || target.invulnerable) return false;
    const kind = options.kind ?? 'attack';
    const tc = target.center;
    const fromX = options.fromX ?? attacker?.center.x ?? tc.x - target.move.facing;
    const fromY = options.fromY ?? attacker?.center.y ?? tc.y;

    if (target.instinctTime > 0 && target.dodgeCooldown === 0) {
      if (options.dodgeDirX !== undefined && options.dodgeDirY !== undefined) {
        target.dodge(this, options.dodgeDirX, options.dodgeDirY);
      } else {
        target.dodgeAway(this, fromX, fromY);
      }
      return false;
    }

    target.applyDamage(this, amount, kind !== 'dot');
    const credit = attacker ? (attacker.owner ?? attacker) : null;
    this.emit({
      type: SimEvent.Hit,
      fighterId: target.id,
      x: tc.x,
      y: tc.y,
      dir: target.move.facing,
      power: amount,
      tint: attacker?.tint ?? 0xffffff,
      attackerId: credit?.id,
      kind,
    });
    if (credit) for (const t of credit.traits) t.onHit?.(credit, this, target, amount, kind);
    if (target.alive) for (const t of target.traits) t.onDamaged?.(target, this, amount);
    return true;
  }

  step(): void {
    for (const fighter of this.fighters.slice()) fighter.step(this);
    for (const p of this.projectiles) p.step(this);
    let w = 0;
    for (let i = 0; i < this.projectiles.length; i++) {
      const p = this.projectiles[i];
      if (p.alive) this.projectiles[w++] = p;
    }
    this.projectiles.length = w;
    for (const system of this.systems) system.step(this);
    this.tick++;
  }
}
