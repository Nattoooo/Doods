import { defineClip } from './clips';
import { burstPainter } from '../render/placeholder';

export const FX_CLIPS = {
  stepDust: defineClip('fx_dust_step', 'Fx/dust_step.png', 16, 16, 5, {
    placeholder: burstPainter(4, 5),
  }),
  landDust: defineClip('fx_dust_land', 'Fx/dust_land.png', 32, 12, 6, {
    placeholder: burstPainter(6, 13),
  }),
  airRing: defineClip('fx_air_ring', 'Fx/air_ring.png', 24, 8, 5, {
    pivot: [12, 4],
    placeholder: burstPainter(8, 11),
  }),
  wallSpark: defineClip('fx_wall_spark', 'Fx/wall_spark.png', 16, 16, 5, {
    pivot: [0, 8],
    placeholder: burstPainter(5, 9),
  }),
  jumpPuff: defineClip('fx_jump_puff', 'Fx/jump_puff.png', 32, 12, 6, {
    placeholder: burstPainter(6, 13),
    placeholderOnly: true,
  }),
  airPuff: defineClip('fx_air_puff', 'Fx/air_puff.png', 24, 8, 5, {
    pivot: [12, 4],
    placeholder: burstPainter(8, 11),
    placeholderOnly: true,
  }),
  wallPuff: defineClip('fx_wall_puff', 'Fx/wall_puff.png', 12, 32, 6, {
    pivot: [0, 16],
    placeholder: burstPainter(6, 13, true),
    placeholderOnly: true,
  }),
};
