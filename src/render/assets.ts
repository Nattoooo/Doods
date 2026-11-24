import type { ClipDef } from '../content/clips';
import { boxPainter } from './placeholder';
import type { Renderer, Texture } from './renderer';

const urls = import.meta.glob('/Sprites/**/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

export interface Sheet {
  readonly def: ClipDef;
  readonly tex: Texture;
  readonly frames: number;
  readonly real: boolean;
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load ${url}`));
    img.src = url;
  });
}

function paintPlaceholder(def: ClipDef): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = def.frameW * def.frames;
  canvas.height = def.frameH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D context unavailable');
  const painter = def.placeholder ?? boxPainter;
  for (let i = 0; i < def.frames; i++) {
    ctx.save();
    ctx.translate(i * def.frameW, 0);
    ctx.beginPath();
    ctx.rect(0, 0, def.frameW, def.frameH);
    ctx.clip();
    painter(ctx, i, def.frames, def);
    ctx.restore();
  }
  return canvas;
}

export class AssetStore {
  private sheets = new Map<string, Sheet>();
  readonly placeholders: string[] = [];

  static async load(renderer: Renderer, defs: Iterable<ClipDef>): Promise<AssetStore> {
    const store = new AssetStore();
    await Promise.all(Array.from(defs, (def) => store.add(renderer, def)));
    if (store.placeholders.length > 0) {
      console.info(`[assets] using placeholders for: ${store.placeholders.sort().join(', ')}`);
    }
    return store;
  }

  private async add(renderer: Renderer, def: ClipDef): Promise<void> {
    const url = def.placeholderOnly ? undefined : urls[`/Sprites/${def.file}`];
    if (url) {
      const img = await loadImage(url);
      const frames = Math.max(1, Math.floor(img.width / def.frameW));
      if (img.height !== def.frameH || img.width % def.frameW !== 0) {
        console.warn(`[assets] ${def.file} is ${img.width}x${img.height}, expected multiples of ${def.frameW}x${def.frameH}`);
      }
      if (frames !== def.frames) {
        console.warn(`[assets] ${def.file} has ${frames} frames, expected ${def.frames}`);
      }
      this.sheets.set(def.id, { def, tex: renderer.createTexture(img), frames, real: true });
      return;
    }
    if (!def.placeholderOnly) this.placeholders.push(def.file);
    this.sheets.set(def.id, {
      def,
      tex: renderer.createTexture(paintPlaceholder(def)),
      frames: def.frames,
      real: false,
    });
  }

  get(def: ClipDef): Sheet {
    const sheet = this.sheets.get(def.id);
    if (!sheet) throw new Error(`Sheet not loaded: ${def.id}`);
    return sheet;
  }

  drawFrame(
    renderer: Renderer,
    def: ClipDef,
    frame: number,
    x: number,
    y: number,
    color: number,
    alpha = 1,
    flipX = false,
  ): void {
    const sheet = this.get(def);
    const f = Math.min(Math.max(0, frame), sheet.frames - 1);
    const dx = flipX ? x - (def.frameW - def.pivotX) : x - def.pivotX;
    renderer.blit(
      sheet.tex,
      f * def.frameW,
      0,
      def.frameW,
      def.frameH,
      Math.round(dx),
      Math.round(y - def.pivotY),
      def.frameW,
      def.frameH,
      color,
      alpha,
      flipX,
    );
  }

  drawFrameRotated(
    renderer: Renderer,
    def: ClipDef,
    frame: number,
    cx: number,
    cy: number,
    anchorX: number,
    anchorY: number,
    angle: number,
    color: number,
    alpha = 1,
    flipX = false,
  ): void {
    const sheet = this.get(def);
    const f = Math.min(Math.max(0, frame), sheet.frames - 1);
    renderer.blitRotated(
      sheet.tex,
      f * def.frameW,
      0,
      def.frameW,
      def.frameH,
      cx,
      cy,
      anchorX,
      anchorY,
      angle,
      color,
      alpha,
      flipX,
    );
  }
}
