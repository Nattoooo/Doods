import { defineSprite } from './clips';
import type { PlaceholderPainter } from './clips';

const wallPainter: PlaceholderPainter = (ctx) => {
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, 8, 1);
  ctx.fillRect(0, 7, 8, 1);
  ctx.fillRect(0, 0, 1, 8);
  ctx.fillRect(7, 0, 1, 8);
  ctx.fillRect(2, 2, 4, 4);
};

const bgPainter: PlaceholderPainter = (ctx) => {
  ctx.fillStyle = '#fff';
  ctx.fillRect(7, 7, 2, 2);
};

export const ARENA_SPRITES = {
  wall: defineSprite('arena_wall', 'Arena/wall.png', 8, 8, { placeholder: wallPainter }),
  bg: defineSprite('arena_bg', 'Arena/bg.png', 16, 16, { placeholder: bgPainter }),
};
