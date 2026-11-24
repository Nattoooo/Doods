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
  hurt?: ClipDef;
}

const S = 24;
const TAU = Math.PI * 2;

export function defineFighterClips(prefix: string, dir: string): FighterClips {
  const file = (name: string) => `${dir}/${name}.png`;
  return {
    idle: defineClip(`${prefix}_idle`, file('idle'), S, S, 16, {
      loop: true,
      placeholder: stickPainter((t) => ({ crouch: Math.sin(t * TAU) * 0.5 + 0.5, armA: 0.25 + Math.sin(t * TAU) * 0.05 })),
    }),
    run: defineClip(`${prefix}_run`, file('run'), S, S, 8, {
      loop: true,
      events: { 0: 'step', 4: 'step' },
      placeholder: stickPainter((t) => ({
        lean: 3,
        crouch: 1,
        legA: Math.sin(t * TAU) * 0.9,
        legB: -Math.sin(t * TAU) * 0.9,
        armA: -Math.sin(t * TAU) * 0.8,
        armB: Math.sin(t * TAU) * 0.8,
      })),
    }),
    jumpStart: defineClip(`${prefix}_jump_start`, file('jump_start'), S, S, 3, {
      placeholder: stickPainter((t) => ({ crouch: t < 0.5 ? 3 : -1, armA: 0.6, armB: -0.6 })),
    }),
    rise: defineClip(`${prefix}_rise`, file('rise'), S, S, 3, {
      placeholder: stickPainter(() => ({ armA: 2.6, armB: -2.6, legA: 0.1, legB: -0.1 })),
    }),
    apex: defineClip(`${prefix}_apex`, file('apex'), S, S, 4, {
      placeholder: stickPainter((t) => ({ crouch: 1 + t * 2, armA: 1.8, armB: -1.8, legA: 0.7, legB: -0.7 })),
    }),
    fall: defineClip(`${prefix}_fall`, file('fall'), S, S, 4, {
      loop: true,
      placeholder: stickPainter((t) => ({
        armA: 2.4 + Math.sin(t * TAU) * 0.2,
        armB: -2.4 - Math.sin(t * TAU) * 0.2,
        legA: 0.4,
        legB: -0.4,
      })),
    }),
    land: defineClip(`${prefix}_land`, file('land'), S, S, 5, {
      placeholder: stickPainter((t) => ({ crouch: 4 * (1 - t), armA: 0.9, armB: -0.9, legA: 0.5 * (1 - t), legB: -0.5 * (1 - t) })),
    }),
    doubleJump: defineClip(`${prefix}_double_jump`, file('double_jump'), S, S, 8, {
      placeholder: stickPainter((t) => ({ crouch: 3, rot: t * TAU, armA: 0.8, armB: -0.8, legA: 0.8, legB: -0.8 })),
    }),
    wallSlide: defineClip(`${prefix}_wall_slide`, file('wall_slide'), S, S, 4, {
      loop: true,
      placeholder: stickPainter((t) => ({
        lean: 1,
        crouch: 2,
        armA: 2.2,
        armB: 0.2,
        legA: -0.5,
        legB: -0.8 + Math.sin(t * TAU) * 0.1,
      })),
    }),
    wallKick: defineClip(`${prefix}_wall_kick`, file('wall_kick'), S, S, 5, {
      placeholder: stickPainter((t) => ({ lean: 4 * t, crouch: 3 * (1 - t), rot: -0.5 * t, armA: 2.0, armB: 1.2, legA: -0.4, legB: -0.9 })),
    }),
  };
}

export const CHAR_BASE = defineSprite('char_base', 'Character/base.png', S, S, {
  placeholder: stickPainter(() => ({})),
});

export const CHAR_CLIPS: FighterClips = defineFighterClips('char', 'Character');
