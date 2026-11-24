import type { ClipDef } from '../content/clips';

export type FrameEventHandler = (name: string, clip: ClipDef) => void;

export class Animator {
  clip: ClipDef | null = null;
  frame = 0;
  tick = 0;
  finished = false;

  constructor(private onEvent?: FrameEventHandler) {}

  play(clip: ClipDef, restart = false): void {
    if (this.clip === clip && !restart) return;
    this.clip = clip;
    this.tick = 0;
    this.frame = 0;
    this.finished = false;
    this.fire(0);
  }

  step(): void {
    const clip = this.clip;
    if (!clip || this.finished) return;
    this.tick++;
    if (this.tick >= clip.length) {
      if (clip.loop) {
        this.tick -= clip.length;
      } else {
        this.tick = clip.length - 1;
        this.finished = true;
      }
    }
    const next = this.frameAt(clip, this.tick);
    if (next !== this.frame) {
      this.frame = next;
      this.fire(next);
    }
  }

  private frameAt(clip: ClipDef, tick: number): number {
    const ends = clip.ends;
    for (let i = 0; i < ends.length; i++) {
      if (tick < ends[i]) return i;
    }
    return ends.length - 1;
  }

  private fire(frame: number): void {
    const clip = this.clip;
    if (!clip || !this.onEvent) return;
    const name = clip.events[frame];
    if (name !== undefined) this.onEvent(name, clip);
  }
}
