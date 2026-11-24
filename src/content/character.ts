import { defineClip, defineSprite } from './clips';
import type { ClipDef } from './clips';
import { stickPainter } from '../render/placeholder';

export interface FighterClips {
  idle: ClipDef;
  run: ClipDef;
  jumpStart: ClipDef;
  rise: ClipDef;
  apex: ClipDef;
  fall: ClipDef;
  land: ClipDef;
  doubleJump: ClipDef;
  wallSlide: ClipDef;
  wallKick: ClipDef;
}

const S = 24;
const DIR = 'Character';

export const CHAR_BASE = defineSprite('char_base', `${DIR}/base.png`, S, S, {
  placeholder: stickPainter(() => ({})),
});

export const CHAR_CLIPS: FighterClips = {
  idle: defineClip('char_idle', `${DIR}/idle.png`, S, S, 16, {
    loop: true,
    placeholder: stickPainter((t) => ({ crouch: Math.sin(t * Math.PI * 2) * 0.5 + 0.5, armA: 0.25 + Math.sin(t * Math.PI * 2) * 0.05 })),
  }),
  run: defineClip('char_run', `${DIR}/run.png`, S, S, 8, {
    loop: true,
    events: { 0: 'step', 4: 'step' },
    placeholder: stickPainter((t) => ({
      lean: 3,
      crouch: 1,
      legA: Math.sin(t * Math.PI * 2) * 0.9,
      legB: -Math.sin(t * Math.PI * 2) * 0.9,
      armA: -Math.sin(t * Math.PI * 2) * 0.8,
      armB: Math.sin(t * Math.PI * 2) * 0.8,
    })),
  }),
  jumpStart: defineClip('char_jump_start', `${DIR}/jump_start.png`, S, S, 3, {
    placeholder: stickPainter((t) => ({ crouch: t < 0.5 ? 3 : -1, armA: 0.6, armB: -0.6 })),
  }),
  rise: defineClip('char_rise', `${DIR}/rise.png`, S, S, 3, {
    placeholder: stickPainter(() => ({ armA: 2.6, armB: -2.6, legA: 0.1, legB: -0.1 })),
  }),
  apex: defineClip('char_apex', `${DIR}/apex.png`, S, S, 4, {
    placeholder: stickPainter((t) => ({ crouch: 1 + t * 2, armA: 1.8, armB: -1.8, legA: 0.7, legB: -0.7 })),
  }),
  fall: defineClip('char_fall', `${DIR}/fall.png`, S, S, 4, {
    loop: true,
    placeholder: stickPainter((t) => ({ armA: 2.4 + Math.sin(t * Math.PI * 2) * 0.2, armB: -2.4 - Math.sin(t * Math.PI * 2) * 0.2, legA: 0.4, legB: -0.4 })),
  }),
  land: defineClip('char_land', `${DIR}/land.png`, S, S, 5, {
    placeholder: stickPainter((t) => ({ crouch: 4 * (1 - t), armA: 0.9, armB: -0.9, legA: 0.5 * (1 - t), legB: -0.5 * (1 - t) })),
  }),
  doubleJump: defineClip('char_double_jump', `${DIR}/double_jump.png`, S, S, 8, {
    placeholder: stickPainter((t) => ({ crouch: 3, rot: t * Math.PI * 2, armA: 0.8, armB: -0.8, legA: 0.8, legB: -0.8 })),
  }),
  wallSlide: defineClip('char_wall_slide', `${DIR}/wall_slide.png`, S, S, 4, {
    loop: true,
    placeholder: stickPainter((t) => ({ lean: 1, crouch: 2, armA: 2.2, armB: 0.2, legA: -0.5, legB: -0.8 + Math.sin(t * Math.PI * 2) * 0.1 })),
  }),
  wallKick: defineClip('char_wall_kick', `${DIR}/wall_kick.png`, S, S, 5, {
    placeholder: stickPainter((t) => ({ lean: 4 * t, crouch: 3 * (1 - t), rot: -0.5 * t, armA: 2.0, armB: 1.2, legA: -0.4, legB: -0.9 })),
  }),
};
