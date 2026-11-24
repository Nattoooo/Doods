import { IdleController } from '../sim/mirror';
import { Fighter } from '../sim/fighter';
import type { World } from '../sim/world';
import { CHAR_BASE, CHAR_CLIPS } from './character';

export function createDummy(world: World, x: number, y: number): Fighter {
  return new Fighter({
    id: world.nextId(),
    name: 'DUMMY',
    color: 0xff9f43,
    x,
    y,
    team: 1,
    controller: new IdleController(),
    clips: CHAR_CLIPS,
    portrait: CHAR_BASE,
    respawnDelay: 1.2,
  });
}
