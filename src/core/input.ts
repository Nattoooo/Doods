import { VIEW_H, VIEW_W } from '../config';

export const Action = {
  Left: 1,
  Right: 2,
  Up: 4,
  Down: 8,
  Jump: 16,
  Teleport: 32,
} as const;

export interface InputState {
  readonly held: number;
  readonly pressed: number;
  readonly aimX: number;
  readonly aimY: number;
}

export const NO_INPUT: InputState = { held: 0, pressed: 0, aimX: 0, aimY: 0 };

export function axisX(input: InputState): number {
  return ((input.held & Action.Right) !== 0 ? 1 : 0) - ((input.held & Action.Left) !== 0 ? 1 : 0);
}

export function isHeld(input: InputState, action: number): boolean {
  return (input.held & action) !== 0;
}

export function isPressed(input: InputState, action: number): boolean {
  return (input.pressed & action) !== 0;
}

export const DEFAULT_KEY_BINDINGS: Record<string, number> = {
  KeyA: Action.Left,
  ArrowLeft: Action.Left,
  KeyD: Action.Right,
  ArrowRight: Action.Right,
  KeyW: Action.Up | Action.Jump,
  ArrowUp: Action.Up | Action.Jump,
  Space: Action.Jump,
  KeyS: Action.Down,
  ArrowDown: Action.Down,
};

export const DEFAULT_MOUSE_BINDINGS: Record<number, number> = {
  2: Action.Teleport,
};

const PAD_DEADZONE = 0.35;

export class DeviceController {
  private keys = new Set<string>();
  private latch = 0;
  private padHeld = 0;
  private mouseHeld = 0;
  private aimX = VIEW_W / 2;
  private aimY = VIEW_H / 2;

  constructor(
    target: Window,
    private bindings: Record<string, number> = DEFAULT_KEY_BINDINGS,
  ) {
    target.addEventListener('keydown', (e) => {
      const bound = this.bindings[e.code];
      if (bound === undefined) return;
      e.preventDefault();
      if (e.repeat) return;
      this.keys.add(e.code);
      this.latch |= bound;
    });
    target.addEventListener('keyup', (e) => {
      if (this.bindings[e.code] === undefined) return;
      e.preventDefault();
      this.keys.delete(e.code);
    });
    target.addEventListener('blur', () => {
      this.keys.clear();
      this.latch = 0;
    });
  }

  attachPointer(
    canvas: HTMLCanvasElement,
    toView: (clientX: number, clientY: number) => readonly [number, number],
    bindings: Record<number, number> = DEFAULT_MOUSE_BINDINGS,
  ): void {
    const aim = (e: MouseEvent) => {
      const [x, y] = toView(e.clientX, e.clientY);
      this.aimX = x;
      this.aimY = y;
    };
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    canvas.addEventListener('mousemove', aim);
    canvas.addEventListener('mousedown', (e) => {
      aim(e);
      const bound = bindings[e.button];
      if (bound === undefined) return;
      e.preventDefault();
      this.mouseHeld |= bound;
      this.latch |= bound;
    });
    window.addEventListener('mouseup', (e) => {
      const bound = bindings[e.button];
      if (bound !== undefined) this.mouseHeld &= ~bound;
    });
    window.addEventListener('blur', () => {
      this.mouseHeld = 0;
    });
  }

  private pollPad(): number {
    if (typeof navigator.getGamepads !== 'function') return 0;
    const pads = navigator.getGamepads();
    let held = 0;
    for (const pad of pads) {
      if (!pad || !pad.connected) continue;
      const ax = pad.axes[0] ?? 0;
      const ay = pad.axes[1] ?? 0;
      if (ax < -PAD_DEADZONE || pad.buttons[14]?.pressed) held |= Action.Left;
      if (ax > PAD_DEADZONE || pad.buttons[15]?.pressed) held |= Action.Right;
      if (ay < -PAD_DEADZONE || pad.buttons[12]?.pressed) held |= Action.Up;
      if (ay > PAD_DEADZONE || pad.buttons[13]?.pressed) held |= Action.Down;
      if (pad.buttons[0]?.pressed) held |= Action.Jump;
    }
    return held;
  }

  read(): InputState {
    let held = 0;
    for (const code of this.keys) held |= this.bindings[code] ?? 0;
    const pad = this.pollPad();
    const padPressed = pad & ~this.padHeld;
    this.padHeld = pad;
    held |= pad | this.mouseHeld;
    const pressed = this.latch | padPressed;
    this.latch = 0;
    return { held, pressed, aimX: this.aimX, aimY: this.aimY };
  }
}
