import type { Controller } from '../../core/controller';
import { Fighter } from '../../sim/fighter';
import { MirrorController } from '../../sim/mirror';
import type { World } from '../../sim/world';
import { Ambush, Chop, Helichopter, Illusion, Instinct, KatanaThrow, Pin, ShurikenTrio, TrackingKunai } from './abilities';
import { NINJA_BASE, NINJA_CLIPS } from './clips';
import { Escapist, Quickfoot, Rapid } from './traits';

export interface NinjaInit {
  x: number;
  y: number;
  controller: Controller;
  color: number;
  name?: string;
  team?: number;
  owner?: Fighter;
  full?: boolean;
  maxHealth?: number;
  ghost?: boolean;
}

export function createNinja(world: World, init: NinjaInit): Fighter {
  const full = init.full ?? true;
  const makeClone = (owner: Fighter, w: World): Fighter =>
    createNinja(w, {
      x: w.arena.innerLeft + w.arena.innerRight - owner.body.x,
      y: owner.body.y,
      controller: new MirrorController(owner),
      color: owner.color,
      name: owner.name,
      team: owner.team,
      owner,
      full: false,
      maxHealth: 10,
      ghost: true,
    });

  return new Fighter({
    id: world.nextId(),
    name: init.name ?? 'NINJA',
    color: init.color,
    x: init.x,
    y: init.y,
    team: init.team ?? 0,
    controller: init.controller,
    clips: NINJA_CLIPS,
    portrait: NINJA_BASE,
    maxHealth: init.maxHealth,
    owner: init.owner ?? null,
    ghost: init.ghost,
    attacks: [new Chop(), new ShurikenTrio(), new KatanaThrow(), new TrackingKunai(), new Ambush(), new Pin(), new Helichopter()],
    supports: full ? [new Instinct(), new Illusion(makeClone)] : [],
    traits: full ? [new Quickfoot(), new Rapid(), new Escapist()] : [new Quickfoot()],
  });
}
