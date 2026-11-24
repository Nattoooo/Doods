import { ARENA_COLS, ARENA_ROWS, HUD_HEIGHT, TILE, VIEW_H, VIEW_W } from '../config';
import { createDummy } from '../content/dummy';
import { FX_CLIPS } from '../content/fx';
import type { ClipDef } from '../content/clips';
import { createNinja } from '../content/ninja/ninja';
import type { Controller } from '../core/controller';
import type { LoopStats } from '../core/loop';
import type { AssetStore } from '../render/assets';
import type { Renderer } from '../render/renderer';
import { Palette } from '../render/ui';
import type { Ui } from '../render/ui';
import { Arena } from '../sim/arena';
import { snapAngle } from '../sim/dodge';
import type { Fighter } from '../sim/fighter';
import { FxSystem } from '../sim/fxSystem';
import type { FxInstance } from '../sim/fxSystem';
import { World } from '../sim/world';
import { drawHud } from './hud';

const PLAYER_COLOR = 0x5ad1ff;
const BORDER = 3;
const GRID = 16;
const SLOT = 18;
const SLOT_GAP = 3;
const SLOT_Y = 43;

interface BarItem {
  label: string;
  cooldownRatio: number;
  active: boolean;
}

export class Game {
  readonly world: World;
  readonly fx: FxSystem;
  readonly player: Fighter;
  readonly dummy: Fighter;
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
      createNinja(this.world, {
        x: arena.innerLeft + 48,
        y: arena.floorY,
        controller: playerController,
        color: PLAYER_COLOR,
        name: 'NINJA',
      }),
    );
    this.dummy = this.world.addFighter(createDummy(this.world, arena.innerRight - 64, arena.floorY));

    window.addEventListener('keydown', (e) => {
      if (e.code === 'F3') {
        e.preventDefault();
        this.debug = !this.debug;
      } else if (e.code === 'KeyR' && !e.repeat) {
        for (const f of this.world.fighters.slice()) if (!f.owner) f.respawn();
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
    this.drawFx(false);
    this.drawGhosts();
    this.drawAuras();
    this.drawFighters();
    this.drawMarks();
    this.drawProjectiles();
    this.drawFx(true);
    drawHud(this.ui, this.assets, this.player, this.dummy);
    this.drawAbilityBar();
    this.drawCrosshair();
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

  private drawFx(front: boolean): void {
    for (const fx of this.fx.instances) {
      if (fx.front !== front) continue;
      this.drawFxInstance(fx);
    }
  }

  private drawFxInstance(fx: FxInstance): void {
    const c = fx.clip;
    if (fx.angle === undefined) {
      this.assets.drawFrame(this.renderer, c, fx.animator.frame, fx.x, fx.y, fx.tint, 1, fx.flip);
      return;
    }
    this.assets.drawFrameRotated(this.renderer, c, fx.animator.frame, fx.x, fx.y, c.anchorX, c.anchorY, fx.angle, fx.tint, 1, fx.flip);
  }

  private drawGhosts(): void {
    for (const g of this.fx.ghosts) this.drawBodyRotated(g.clip, g.frame, g.x, g.y, g.angle, g.flip, g.tint, g.alpha);
  }

  private drawAuras(): void {
    const frame = Math.floor(this.world.tick / 10);
    for (const f of this.world.fighters) {
      if (!f.alive || f.instinctTime <= 0) continue;
      const c = f.center;
      this.assets.drawFrame(this.renderer, FX_CLIPS.aura, frame % FX_CLIPS.aura.frames, c.x, c.y, f.tint, 0.85);
    }
  }

  private drawFighters(): void {
    for (const f of this.world.fighters) {
      if (!f.alive) continue;
      const clip = f.animator.clip;
      if (!clip) continue;
      const b = f.body;
      const alpha = f.ghost ? 0.6 : 1;
      const tint = f.hitFlash > 0 ? 0xffffff : f.tint;
      const frame = f.animator.frame;
      const action = f.action;
      if (action && action.pose === 'rotated') {
        this.drawBodyRotated(clip, frame, b.x, b.y - b.h / 2, action.angle, action.flip, tint, alpha);
      } else if (action && action.pose === 'centered') {
        this.assets.drawFrame(this.renderer, clip, frame, b.x, b.y - b.h / 2, tint, alpha, f.move.facing < 0);
      } else {
        this.assets.drawFrame(this.renderer, clip, frame, b.x, b.y, tint, alpha, f.move.facing < 0);
      }
    }
  }

  private drawMarks(): void {
    for (const f of this.world.fighters) {
      const m = f.kunaiMark;
      if (!f.alive || !m) continue;
      const c = f.center;
      const owner = this.world.getFighter(m.ownerId);
      this.drawBodyRotated(m.clip, 0, c.x + m.ox, c.y + m.oy, m.angle, false, owner ? owner.tint : f.tint, 1);
    }
  }

  private drawProjectiles(): void {
    for (const p of this.world.projectiles) {
      const c = p.clip;
      this.assets.drawFrameRotated(
        this.renderer,
        c,
        p.frame,
        p.x,
        p.y,
        c.anchorX,
        c.anchorY,
        snapAngle(p.angle),
        p.owner.tint,
      );
    }
  }

  private drawBodyRotated(
    clip: ClipDef,
    frame: number,
    cx: number,
    cy: number,
    angle: number,
    flip: boolean,
    tint: number,
    alpha: number,
  ): void {
    this.assets.drawFrameRotated(this.renderer, clip, frame, cx, cy, clip.anchorX, clip.anchorY, angle, tint, alpha, flip);
  }

  private drawAbilityBar(): void {
    const p = this.player;
    const items: BarItem[] = [];
    p.attacks.forEach((a, i) => {
      if (a) items.push({ label: String(i + 1), cooldownRatio: a.cooldownRatio, active: a.active });
    });
    const supportKeys = ['Q', 'E', 'F'];
    p.supports.forEach((a, i) => {
      if (a) items.push({ label: supportKeys[i], cooldownRatio: a.cooldownRatio, active: a.active });
    });
    items.push({ label: 'M2', cooldownRatio: 1 - p.dodgeReady, active: p.dodgeReady < 1 && p.action !== null && p.action.invulnerable });

    const total = items.length * SLOT + (items.length - 1) * SLOT_GAP;
    const x0 = Math.round((VIEW_W - total) / 2);
    items.forEach((item, i) => {
      const x = x0 + i * (SLOT + SLOT_GAP);
      const ready = item.cooldownRatio <= 0;
      const border = item.active ? Palette.text : ready ? p.color : Palette.dim;
      this.ui.box(x, SLOT_Y, SLOT, SLOT, { fill: Palette.bg, fillAlpha: 0.85, border });
      const cover = Math.round((SLOT - 2) * Math.min(1, item.cooldownRatio));
      if (cover > 0) this.renderer.rect(x + 1, SLOT_Y + 1, SLOT - 2, cover, Palette.dim, 0.55);
      const w = item.label.length * 8;
      this.ui.text(item.label, x + Math.round((SLOT - w) / 2), SLOT_Y + 5, ready || item.active ? Palette.text : Palette.dim);
    });
  }

  private drawCrosshair(): void {
    const r = this.renderer;
    const x = Math.round(this.player.aimX);
    const y = Math.round(this.player.aimY);
    const c = this.player.color;
    r.rect(x - 4, y, 3, 1, c);
    r.rect(x + 2, y, 3, 1, c);
    r.rect(x, y - 4, 1, 3, c);
    r.rect(x, y + 2, 1, 3, c);
  }

  private drawDebug(): void {
    const r = this.renderer;
    for (const f of this.world.fighters) {
      if (!f.alive) continue;
      const b = f.body;
      r.outline(Math.round(b.x - b.w / 2), Math.round(b.y - b.h), b.w, b.h, Palette.debug, 0.8);
    }
    const p = this.player;
    const lines = [
      `FPS ${this.fps}  SIM ${this.stats.stepsLastFrame}/F  TICK ${this.world.tick}`,
      `POS ${p.body.x.toFixed(1)},${p.body.y.toFixed(1)}  VEL ${p.body.vx.toFixed(0)},${p.body.vy.toFixed(0)}`,
      `ANIM ${p.animator.clip?.id ?? '-'} ${p.animator.frame}  HP ${p.health.toFixed(1)}`,
      `AIR ${p.move.airJumpsLeft}  WALL ${p.move.wallDir}  GND ${p.move.grounded ? 1 : 0}`,
      `DUMMY HP ${this.dummy.health.toFixed(1)}  PROJ ${this.world.projectiles.length}`,
      `PLACEHOLDERS ${this.assets.placeholders.length}`,
    ];
    const h = lines.length * 10 + 6;
    this.ui.box(4, VIEW_H - h - 4, 264, h, { fill: Palette.bg, fillAlpha: 0.85, border: Palette.debug });
    lines.forEach((line, i) => this.ui.text(line, 8, VIEW_H - h + i * 10, Palette.debug));
  }
}
