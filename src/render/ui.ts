import type { PixelFont } from './font';
import type { Renderer } from './renderer';

export const Palette = {
  bg: 0x0c0e13,
  panel: 0x131720,
  border: 0xe6e9f0,
  text: 0xe6e9f0,
  dim: 0x5c6475,
  arena: 0x9aa3b2,
  arenaGrid: 0x1c212c,
  danger: 0xff5a5a,
  debug: 0x6dff9a,
} as const;

export interface BoxStyle {
  fill?: number;
  fillAlpha?: number;
  border?: number;
}

export class Ui {
  constructor(
    readonly renderer: Renderer,
    readonly font: PixelFont,
  ) {}

  box(x: number, y: number, w: number, h: number, style: BoxStyle = {}): void {
    const fill = style.fill ?? Palette.panel;
    const border = style.border ?? Palette.border;
    this.renderer.rect(x, y, w, h, fill, style.fillAlpha ?? 1);
    this.renderer.outline(x, y, w, h, border);
  }

  bar(x: number, y: number, w: number, h: number, ratio: number, color: number, border: number = Palette.border): void {
    this.box(x, y, w, h, { border });
    const inner = Math.round((w - 4) * Math.min(1, Math.max(0, ratio)));
    if (inner > 0) this.renderer.rect(x + 2, y + 2, inner, h - 4, color);
  }

  text(text: string, x: number, y: number, color: number = Palette.text, scale = 1, alpha = 1): void {
    this.font.draw(this.renderer, text, x, y, color, scale, alpha);
  }

  textRight(text: string, right: number, y: number, color: number = Palette.text, scale = 1): void {
    this.text(text, right - this.font.measure(text, scale), y, color, scale);
  }

  textCenter(text: string, cx: number, y: number, color: number = Palette.text, scale = 1): void {
    this.text(text, cx - this.font.measure(text, scale) / 2, y, color, scale);
  }
}
