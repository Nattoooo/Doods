import { Emitter } from '../core/emitter';
import type { Arena } from './arena';
import type { SimEventData } from './events';
import type { Fighter } from './fighter';

export interface Updatable {
  step(world: World): void;
}

export class World {
  readonly fighters: Fighter[] = [];
  readonly systems: Updatable[] = [];
  readonly events = new Emitter<SimEventData>();
  tick = 0;

  constructor(readonly arena: Arena) {}

  addFighter(fighter: Fighter): Fighter {
    this.fighters.push(fighter);
    fighter.attach(this);
    return fighter;
  }

  addSystem(system: Updatable): void {
    this.systems.push(system);
  }

  emit(event: SimEventData): void {
    this.events.emit(event);
  }

  step(): void {
    for (const fighter of this.fighters) fighter.step(this);
    for (const system of this.systems) system.step(this);
    this.tick++;
  }
}
