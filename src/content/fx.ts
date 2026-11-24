import { defineClip } from './clips';
import { arcPainter, burstPainter, ringPainter } from '../render/placeholder';

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
  hit: defineClip('fx_hit', 'Fx/hit.png', 24, 24, 5, {
    pivot: [12, 12],
    placeholder: burstPainter(8, 10),
  }),
  slash: defineClip('fx_slash', 'Fx/slash.png', 40, 32, 5, {
    pivot: [0, 16],
    anchor: [0, 16],
    placeholder: arcPainter(26),
  }),
  smoke: defineClip('fx_smoke', 'Fx/smoke.png', 32, 32, 6, {
    pivot: [16, 16],
    placeholder: burstPainter(5, 11),
  }),
  flashBomb: defineClip('fx_flashbomb', 'Fx/flashbomb.png', 64, 64, 7, {
    pivot: [32, 32],
    placeholder: burstPainter(10, 28),
  }),
  aura: defineClip('fx_aura', 'Fx/aura.png', 32, 32, 8, {
    pivot: [16, 16],
    loop: true,
    placeholder: ringPainter(13),
  }),
};
