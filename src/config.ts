export const VIEW_W = 384;
export const VIEW_H = 192;
export const TILE = 8;

export const SIM_HZ = 240;
export const SIM_DT = 1 / SIM_HZ;
export const RENDER_FPS = 60;
export const ANIM_FPS = 24;
export const TICKS_PER_ANIM_FRAME = SIM_HZ / ANIM_FPS;
export const MAX_STEPS_PER_FRAME = 24;

export const HUD_HEIGHT = 32;
export const ARENA_COLS = VIEW_W / TILE;
export const ARENA_ROWS = (VIEW_H - HUD_HEIGHT) / TILE;
