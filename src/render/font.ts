import type { Renderer, Texture } from './renderer';

const FAMILY = 'Press Start 2P';
const FIRST = 32;
const LAST = 126;
const COLS = 16;
export const GLYPH = 8;

export class PixelFont {
  private constructor(private tex: Texture) {}

  static async create(renderer: Renderer): Promise<PixelFont> {
    await document.fonts.load(`${GLYPH}px "${FAMILY}"`);
    await document.fonts.ready;
    const count = LAST - FIRST + 1;
    const rows = Math.ceil(count / COLS);
    const canvas = document.createElement('canvas');
    canvas.width = COLS * GLYPH;
    canvas.height = rows * GLYPH;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('2D context unavailable');
    ctx.font = `${GLYPH}px "${FAMILY}"`;
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#fff';
    for (let i = 0; i < count; i++) {
      ctx.fillText(String.fromCharCode(FIRST + i), (i % COLS) * GLYPH, Math.floor(i / COLS) * GLYPH);
    }
    const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const px = image.data;
    for (let i = 0; i < px.length; i += 4) {
      const on = px[i + 3] >= 128;
      px[i] = 255;
      px[i + 1] = 255;
      px[i + 2] = 255;
      px[i + 3] = on ? 255 : 0;
    }
    ctx.putImageData(image, 0, 0);
    return new PixelFont(renderer.createTexture(canvas));
  }

  measure(text: string, scale = 1): number {
    return text.length * GLYPH * scale;
  }

  draw(renderer: Renderer, text: string, x: number, y: number, color: number, scale = 1, alpha = 1): void {
    const size = GLYPH * scale;
    for (let i = 0; i < text.length; i++) {
      let code = text.charCodeAt(i);
      if (code < FIRST || code > LAST) code = 63;
      if (code === 32) continue;
      const idx = code - FIRST;
      renderer.blit(
        this.tex,
        (idx % COLS) * GLYPH,
        Math.floor(idx / COLS) * GLYPH,
        GLYPH,
        GLYPH,
        Math.round(x + i * size),
        Math.round(y),
        size,
        size,
        color,
        alpha,
      );
    }
  }
}
