import { TICKS_PER_ANIM_FRAME } from '../config';

export type PlaceholderPainter = (
  ctx: CanvasRenderingContext2D,
  frame: number,
  frames: number,
  def: ClipDef,
) => void;

export interface ClipDef {
  readonly id: string;
  readonly file: string;
  readonly frameW: number;
  readonly frameH: number;
  readonly frames: number;
  readonly loop: boolean;
  readonly durations: readonly number[];
  readonly ends: readonly number[];
  readonly length: number;
  readonly events: Readonly<Record<number, string>>;
  readonly pivotX: number;
  readonly pivotY: number;
  readonly placeholder?: PlaceholderPainter;
  readonly placeholderOnly: boolean;
}

export interface ClipOptions {
  loop?: boolean;
  durations?: number | readonly number[];
  events?: Record<number, string>;
  pivot?: readonly [number, number];
  placeholder?: PlaceholderPainter;
  placeholderOnly?: boolean;
}

export const clipRegistry = new Map<string, ClipDef>();

function normalizeDurations(frames: number, durations: number | readonly number[] | undefined): number[] {
  const out: number[] = [];
  for (let i = 0; i < frames; i++) {
    if (durations === undefined) out.push(1);
    else if (typeof durations === 'number') out.push(durations);
    else out.push(durations[Math.min(i, durations.length - 1)] ?? 1);
  }
  return out;
}

export function defineClip(
  id: string,
  file: string,
  frameW: number,
  frameH: number,
  frames: number,
  options: ClipOptions = {},
): ClipDef {
  if (clipRegistry.has(id)) throw new Error(`Duplicate clip id: ${id}`);
  const durations = normalizeDurations(frames, options.durations);
  const ends: number[] = [];
  let acc = 0;
  for (const d of durations) {
    acc += d * TICKS_PER_ANIM_FRAME;
    ends.push(acc);
  }
  const def: ClipDef = {
    id,
    file,
    frameW,
    frameH,
    frames,
    loop: options.loop ?? false,
    durations,
    ends,
    length: acc,
    events: options.events ?? {},
    pivotX: options.pivot?.[0] ?? frameW / 2,
    pivotY: options.pivot?.[1] ?? frameH,
    placeholder: options.placeholder,
    placeholderOnly: options.placeholderOnly ?? false,
  };
  clipRegistry.set(id, def);
  return def;
}

export function defineSprite(
  id: string,
  file: string,
  w: number,
  h: number,
  options: ClipOptions = {},
): ClipDef {
  return defineClip(id, file, w, h, 1, options);
}
