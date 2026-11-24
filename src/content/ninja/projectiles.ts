import { ANIM_FPS, SIM_DT } from '../../config';
import { clamp } from '../../core/math';
import { dodgeAround } from '../../sim/combat';
import { SimEvent } from '../../sim/events';
import type { Fighter } from '../../sim/fighter';
import { Projectile } from '../../sim/projectile';
import type { World } from '../../sim/world';
import { NINJA_PROJECTILES } from './clips';

export const PROJECTILE_TUNING = {
  shuriken: { speed: 420, damage: 3, life: 1.6, radius: 3, turnRate: 9 },
  kunai: { speed: 650, damage: 8, life: 1.6, radius: 3, markTime: 5 },
  katana: { speed: 520, damage: 10, radius: 5, outLife: 2, backSpeed: 850, pullTime: 1.2 },
};

function creditOf(f: Fighter): Fighter {
  return f.owner ?? f;
}

function markedEnemy(world: World, owner: Fighter): Fighter | null {
  const root = creditOf(owner);
  for (const e of world.enemiesOf(owner)) if (e.kunaiMark && e.kunaiMark.ownerId === root.id) return e;
  return null;
}

function hitOptions(p: Projectile, target: Fighter, world: World) {
  const c = target.center;
  const dir = dodgeAround(p.vx, p.vy, c.x - p.x, c.y - p.y, world.rng.next() < 0.5 ? -1 : 1);
  return { kind: 'attack', fromX: p.x - p.vx, fromY: p.y - p.vy, dodgeDirX: dir.x, dodgeDirY: dir.y };
}

function wallSpark(world: World, p: Projectile): void {
  world.emit({ type: SimEvent.Hit, fighterId: p.owner.id, x: p.x, y: p.y, dir: 1, power: 0, tint: p.owner.tint, kind: 'spark' });
}

function wrapAngle(a: number): number {
  let r = a;
  while (r > Math.PI) r -= Math.PI * 2;
  while (r < -Math.PI) r += Math.PI * 2;
  return r;
}

export class Shuriken extends Projectile {
  constructor(owner: Fighter, x: number, y: number, angle: number) {
    const t = PROJECTILE_TUNING.shuriken;
    super(owner, x, y, Math.cos(angle) * t.speed, Math.sin(angle) * t.speed, NINJA_PROJECTILES.shuriken, t.radius);
  }

  get frame(): number {
    return Math.floor(this.age * ANIM_FPS) % 4;
  }

  step(world: World): void {
    const t = PROJECTILE_TUNING.shuriken;
    this.age += SIM_DT;
    if (this.age > t.life) {
      this.alive = false;
      return;
    }
    const target = markedEnemy(world, this.owner);
    if (target) {
      const c = target.center;
      const desired = Math.atan2(c.y - this.y, c.x - this.x);
      const current = Math.atan2(this.vy, this.vx);
      const turn = clamp(wrapAngle(desired - current), -t.turnRate * SIM_DT, t.turnRate * SIM_DT);
      this.vx = Math.cos(current + turn) * t.speed;
      this.vy = Math.sin(current + turn) * t.speed;
    }
    const r = this.sweep(world);
    if (r.hit) {
      if (world.damage(this.owner, r.hit, t.damage, hitOptions(this, r.hit, world))) this.alive = false;
    } else if (r.wall) {
      wallSpark(world, this);
      this.alive = false;
    }
  }
}

export class Kunai extends Projectile {
  constructor(owner: Fighter, x: number, y: number, angle: number) {
    const t = PROJECTILE_TUNING.kunai;
    super(owner, x, y, Math.cos(angle) * t.speed, Math.sin(angle) * t.speed, NINJA_PROJECTILES.kunai, t.radius);
  }

  step(world: World): void {
    const t = PROJECTILE_TUNING.kunai;
    this.age += SIM_DT;
    if (this.age > t.life) {
      this.alive = false;
      return;
    }
    const r = this.sweep(world);
    if (r.hit) {
      const target = r.hit;
      if (world.damage(this.owner, target, t.damage, hitOptions(this, target, world))) {
        if (target.alive) {
          const c = target.center;
          target.kunaiMark = {
            clip: this.clip,
            time: t.markTime,
            ownerId: creditOf(this.owner).id,
            angle: Math.atan2(this.vy, this.vx),
            ox: clamp(this.x - c.x, -3, 3),
            oy: clamp(this.y - c.y, -8, 8),
          };
        }
        this.alive = false;
      }
    } else if (r.wall) {
      wallSpark(world, this);
      this.alive = false;
    }
  }
}

type KatanaState = 'out' | 'back' | 'drag';

export class Katana extends Projectile {
  private state: KatanaState = 'out';
  private target: Fighter | null = null;

  constructor(owner: Fighter, x: number, y: number, angle: number) {
    const t = PROJECTILE_TUNING.katana;
    super(owner, x, y, Math.cos(angle) * t.speed, Math.sin(angle) * t.speed, NINJA_PROJECTILES.katana, t.radius);
  }

  step(world: World): void {
    const t = PROJECTILE_TUNING.katana;
    this.age += SIM_DT;

    if (this.state === 'out') {
      if (this.age > t.outLife) {
        this.state = 'back';
      } else {
        const r = this.sweep(world);
        if (r.hit) {
          const target = r.hit;
          if (world.damage(this.owner, target, t.damage, hitOptions(this, target, world))) {
            if (target.alive) {
              target.pull = { puller: this.owner, time: t.pullTime };
              this.target = target;
              this.state = 'drag';
            } else {
              this.state = 'back';
            }
          }
        } else if (r.wall) {
          wallSpark(world, this);
          this.state = 'back';
        }
      }
    }

    const o = this.owner.center;
    if (this.state === 'back') {
      const dx = o.x - this.x;
      const dy = o.y - this.y;
      const dist = Math.hypot(dx, dy);
      if (!this.owner.alive || dist < 12) {
        this.alive = false;
        return;
      }
      this.vx = (dx / dist) * t.backSpeed;
      this.vy = (dy / dist) * t.backSpeed;
      this.x += this.vx * SIM_DT;
      this.y += this.vy * SIM_DT;
    } else if (this.state === 'drag') {
      const target = this.target;
      if (!target || !target.alive || !target.pull) {
        this.alive = false;
        return;
      }
      const c = target.center;
      this.x = c.x;
      this.y = c.y;
      this.vx = o.x - c.x;
      this.vy = o.y - c.y;
    }
  }
}
