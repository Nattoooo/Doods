import { defineFighterClips } from '../character';
import type { FighterClips } from '../character';
import { defineClip, defineSprite } from '../clips';
import type { ClipDef, PlaceholderPainter } from '../clips';
import { crossPainter, linePainter, stickPainter } from '../../render/placeholder';

export interface NinjaClips extends FighterClips {
  hurt: ClipDef;
  chop: ClipDef;
  throw: ClipDef;
  stab: ClipDef;
  heli: ClipDef;
}

const heliPainter: PlaceholderPainter = (ctx, frame, frames, def) => {
  stickPainter(() => ({ crouch: 2, armA: 3.0, armB: -3.0, legA: 0.6, legB: -0.6 }), 12, 14)(ctx, frame, frames, def);
  const reach = Math.max(5, Math.round(22 * Math.abs(Math.cos((frame / frames) * Math.PI))));
  ctx.fillStyle = '#fff';
  ctx.fillRect(24 - reach, 11, reach * 2, 2);
};

export const NINJA_BASE = defineSprite('ninja_base', 'Ninja/base.png', 24, 24, {
  placeholder: stickPainter(() => ({})),
});

export const NINJA_CLIPS: NinjaClips = {
  ...defineFighterClips('ninja', 'Ninja'),
  hurt: defineClip('ninja_hurt', 'Ninja/hurt.png', 24, 24, 3, {
    placeholder: stickPainter((t) => ({ lean: -3 - t * 2, armA: 2.2, armB: -2.2, legA: 0.3, legB: -0.3 })),
  }),
  chop: defineClip('ninja_chop', 'Ninja/chop.png', 40, 24, 6, {
    pivot: [20, 12],
    anchor: [20, 12],
    placeholder: stickPainter((t) => ({ lean: 4 + t * 2, crouch: 1, armA: 1.57, armB: 1.3, legA: -0.5, legB: 0.5 }), 8, 0),
  }),
  throw: defineClip('ninja_throw', 'Ninja/throw.png', 32, 24, 5, {
    pivot: [16, 24],
    placeholder: stickPainter((t) => ({ lean: 2, armA: t < 0.4 ? -1.2 : 1.57, armB: 0.3 }), 4, 0),
  }),
  stab: defineClip('ninja_stab', 'Ninja/stab.png', 40, 24, 4, {
    pivot: [20, 12],
    anchor: [20, 12],
    loop: true,
    placeholder: stickPainter(() => ({ rot: Math.PI / 2, armA: 3.0, armB: 2.8, legA: 0.1, legB: -0.1 }), 8, 0),
  }),
  heli: defineClip('ninja_heli', 'Ninja/heli.png', 48, 48, 6, {
    pivot: [24, 24],
    anchor: [24, 24],
    loop: true,
    placeholder: heliPainter,
  }),
};

export const NINJA_PROJECTILES = {
  shuriken: defineClip('ninja_shuriken', 'Ninja/shuriken.png', 8, 8, 4, {
    pivot: [4, 4],
    anchor: [4, 4],
    loop: true,
    placeholder: crossPainter(),
  }),
  kunai: defineSprite('ninja_kunai', 'Ninja/kunai.png', 12, 5, {
    pivot: [6, 2],
    anchor: [6, 2],
    placeholder: linePainter(12, 2),
  }),
  katana: defineSprite('ninja_katana', 'Ninja/katana.png', 28, 7, {
    pivot: [14, 3],
    anchor: [14, 3],
    placeholder: linePainter(28, 2),
  }),
};
