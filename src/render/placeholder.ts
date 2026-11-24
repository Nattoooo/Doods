import type { PlaceholderPainter } from '../content/clips';

export interface Pose {
  crouch: number;
  lean: number;
  armA: number;
  armB: number;
  legA: number;
  legB: number;
  rot: number;
}

export type PoseFn = (t: number) => Partial<Pose>;

const REST: Pose = { crouch: 0, lean: 0, armA: 0.25, armB: -0.25, legA: 0.12, legB: -0.12, rot: 0 };

function stamp(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
  ctx.fillRect(Math.floor(x), Math.floor(y), size, size);
}

function line(
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  size: number,
): void {
  const steps = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    stamp(ctx, x0 + (x1 - x0) * t - size / 2, y0 + (y1 - y0) * t - size / 2, size);
  }
}

export function stickPainter(fn: PoseFn): PlaceholderPainter {
  return (ctx, frame, frames) => {
    const t = frames > 1 ? frame / frames : 0;
    const p: Pose = { ...REST, ...fn(t) };
    const pivot = { x: 12, y: 15 };
    const cos = Math.cos(p.rot);
    const sin = Math.sin(p.rot);
    const rot = (x: number, y: number): [number, number] => {
      const dx = x - pivot.x;
      const dy = y - pivot.y;
      return [pivot.x + dx * cos - dy * sin, pivot.y + dx * sin + dy * cos];
    };

    const hip: [number, number] = [12, 16 + p.crouch];
    const shoulder: [number, number] = [hip[0] + p.lean * 0.5, hip[1] - 6];
    const head: [number, number] = [shoulder[0] + p.lean * 0.5, shoulder[1] - 4.5];
    const legLen = 8 - p.crouch;
    const armLen = 6;

    ctx.fillStyle = '#fff';
    const seg = (a: [number, number], b: [number, number]) => {
      const [x0, y0] = rot(a[0], a[1]);
      const [x1, y1] = rot(b[0], b[1]);
      line(ctx, x0, y0, x1, y1, 2);
    };

    seg(hip, shoulder);
    seg(hip, [hip[0] + Math.sin(p.legA) * legLen, hip[1] + Math.cos(p.legA) * legLen - 1]);
    seg(hip, [hip[0] + Math.sin(p.legB) * legLen, hip[1] + Math.cos(p.legB) * legLen - 1]);
    seg(shoulder, [shoulder[0] + Math.sin(p.armA) * armLen, shoulder[1] + Math.cos(p.armA) * armLen]);
    seg(shoulder, [shoulder[0] + Math.sin(p.armB) * armLen, shoulder[1] + Math.cos(p.armB) * armLen]);

    const [hx, hy] = rot(head[0], head[1]);
    for (let y = -3; y < 3; y++) {
      for (let x = -3; x < 3; x++) {
        if ((x + 0.5) ** 2 + (y + 0.5) ** 2 <= 9.5) ctx.fillRect(Math.round(hx) + x, Math.round(hy) + y, 1, 1);
      }
    }
  };
}

export function burstPainter(count: number, reach: number): PlaceholderPainter {
  return (ctx, frame, frames, def) => {
    const t = frames > 1 ? frame / (frames - 1) : 0;
    ctx.fillStyle = '#fff';
    const size = Math.max(1, Math.round(3 * (1 - t)));
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      const r = reach * (0.25 + t * 0.75);
      ctx.fillRect(
        Math.round(def.pivotX + Math.cos(a) * r - size / 2),
        Math.round(def.pivotY - 2 + Math.sin(a) * r * 0.5 - size / 2),
        size,
        size,
      );
    }
  };
}

export const boxPainter: PlaceholderPainter = (ctx, _frame, _frames, def) => {
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, def.frameW, 1);
  ctx.fillRect(0, def.frameH - 1, def.frameW, 1);
  ctx.fillRect(0, 0, 1, def.frameH);
  ctx.fillRect(def.frameW - 1, 0, 1, def.frameH);
};
