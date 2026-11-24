import { ARENA_COLS, ARENA_ROWS, HUD_HEIGHT, TILE, VIEW_H, VIEW_W } from '../config';
import { CHAR_CLIPS } from '../content/character';
import type { Controller } from '../core/controller';
import type { LoopStats } from '../core/loop';
import type { AssetStore } from '../render/assets';
import type { Renderer } from '../render/renderer';
import { Palette } from '../render/ui';
import type { Ui } from '../render/ui';
import { Arena } from '../sim/arena';
import { Fighter } from '../sim/fighter';
import { FxSystem } from '../sim/fxSystem';
import { World } from '../sim/world';
import { drawHud } from './hud';

const PLAYER_COLOR = 0x5ad1ff;
const BORDER = 3;
const GRID = 16;
const HINT = 'A/D MOVE  W/SPACE JUMP  R RESET  F3 DEBUG';

export class Game {
  readonly world: World;
  readonly fx: FxSystem;
  readonly player: Fighter;
  debug = false;
  stats: LoopStats = { stepsLastFrame: 0 };

  private frames = 0;
  private fps = 0;
  private fpsClock = performance.now();

  constructor(
    private renderer: Renderer,
    private assets: AssetStore,
    private ui: Ui,
    playerController: Controller,
  ) {
    const arena = new Arena({ cols: ARENA_COLS, rows: ARENA_ROWS, originX: 0, originY: HUD_HEIGHT });
    this.world = new World(arena);
    this.fx = new FxSystem(this.world);
    this.world.addSystem(this.fx);
    this.player = this.world.addFighter(
      new Fighter({
        id: 0,
        name: 'YOU',
        color: PLAYER_COLOR,
        x: arena.innerLeft + 48,
        y: arena.floorY,
        controller: playerController,
        clips: CHAR_CLIPS,
      }),
    );

    window.addEventListener('keydown', (e) => {
      if (e.code === 'F3') {
        e.preventDefault();
        this.debug = !this.debug;
      } else if (e.code === 'KeyR' && !e.repeat) {
        for (const f of this.world.fighters) f.respawn();
      }
    });
  }

  step(): void {
    this.world.step();
  }

  render(): void {
    const r = this.renderer;
    this.trackFps();
    r.begin();
    r.rect(0, 0, VIEW_W, VIEW_H, Palette.bg);
    this.drawArena();
    this.drawFx();
    this.drawFighters();
    drawHud(this.ui, this.assets, this.world.fighters[0], this.world.fighters[1]);
    this.ui.textCenter(HINT, VIEW_W / 2, 44, Palette.dim);
    if (this.debug) this.drawDebug();
    r.end();
  }

  private trackFps(): void {
    this.frames++;
    const now = performance.now();
    if (now - this.fpsClock >= 500) {
      this.fps = Math.round((this.frames * 1000) / (now - this.fpsClock));
      this.frames = 0;
      this.fpsClock = now;
    }
  }

  private drawArena(): void {
    const r = this.renderer;
    const arena = this.world.arena;
    const left = arena.innerLeft;
    const right = arena.innerRight;
    const top = arena.tileY(1);
    const bottom = arena.floorY;
    const w = right - left;
    const h = bottom - top;

    for (let x = left + GRID; x < right; x += GRID) r.rect(x, top, 1, h, Palette.arenaGrid);
    for (let y = top + GRID; y < bottom; y += GRID) r.rect(left, y, w, 1, Palette.arenaGrid);

    const t = BORDER;
    r.rect(left - t, top - t, w + t * 2, t, Palette.arena);
    r.rect(left - t, bottom, w + t * 2, t, Palette.arena);
    r.rect(left - t, top, t, h, Palette.arena);
    r.rect(right, top, t, h, Palette.arena);

    for (let row = 1; row < arena.rows - 1; row++) {
      for (let col = 1; col < arena.cols - 1; col++) {
        if (arena.isSolid(col, row)) r.rect(arena.tileX(col), arena.tileY(row), TILE, TILE, Palette.arena);
      }
    }
  }

  private drawFx(): void {
    for (const fx of this.fx.instances) {
      this.assets.drawFrame(this.renderer, fx.clip, fx.animator.frame, fx.x, fx.y, fx.tint, 1, fx.flip);
    }
  }

  private drawFighters(): void {
    for (const f of this.world.fighters) {
      const clip = f.animator.clip;
      if (!clip) continue;
      this.assets.drawFrame(this.renderer, clip, f.animator.frame, f.body.x, f.body.y, f.tint, 1, f.move.facing < 0);
    }
  }

  private drawDebug(): void {
    const r = this.renderer;
    for (const f of this.world.fighters) {
      const b = f.body;
      r.outline(Math.round(b.x - b.w / 2), Math.round(b.y - b.h), b.w, b.h, Palette.debug, 0.8);
    }
    const p = this.player;
    const lines = [
      `FPS ${this.fps}  SIM ${this.stats.stepsLastFrame}/F  TICK ${this.world.tick}`,
      `POS ${p.body.x.toFixed(1)},${p.body.y.toFixed(1)}`,
      `VEL ${p.body.vx.toFixed(0)},${p.body.vy.toFixed(0)}`,
      `ANIM ${p.animator.clip?.id ?? '-'} ${p.animator.frame}`,
      `AIR ${p.move.airJumpsLeft}  WALL ${p.move.wallDir}  GND ${p.move.grounded ? 1 : 0}`,
      `PLACEHOLDERS ${this.assets.placeholders.length}`,
    ];
    const h = lines.length * 10 + 6;
    this.ui.box(4, VIEW_H - h - 4, 232, h, { fill: Palette.bg, fillAlpha: 0.85, border: Palette.debug });
    lines.forEach((line, i) => this.ui.text(line, 8, VIEW_H - h + i * 10, Palette.debug));
  }
}
