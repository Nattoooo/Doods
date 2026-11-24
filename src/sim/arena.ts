import { TILE } from '../config';

export interface ArenaDef {
  cols: number;
  rows: number;
  originX: number;
  originY: number;
  solids?: ReadonlyArray<readonly [col: number, row: number, w: number, h: number]>;
}

const EPS = 1e-4;

export class Arena {
  readonly cols: number;
  readonly rows: number;
  readonly originX: number;
  readonly originY: number;
  private tiles: Uint8Array;

  constructor(def: ArenaDef) {
    this.cols = def.cols;
    this.rows = def.rows;
    this.originX = def.originX;
    this.originY = def.originY;
    this.tiles = new Uint8Array(def.cols * def.rows);
    this.fillBox(0, 0, def.cols, 1);
    this.fillBox(0, def.rows - 1, def.cols, 1);
    this.fillBox(0, 0, 1, def.rows);
    this.fillBox(def.cols - 1, 0, 1, def.rows);
    for (const [c, r, w, h] of def.solids ?? []) this.fillBox(c, r, w, h);
  }

  fillBox(col: number, row: number, w: number, h: number, value = 1): void {
    for (let r = row; r < row + h; r++) {
      for (let c = col; c < col + w; c++) {
        if (c >= 0 && c < this.cols && r >= 0 && r < this.rows) this.tiles[r * this.cols + c] = value;
      }
    }
  }

  isSolid(col: number, row: number): boolean {
    if (col < 0 || row < 0 || col >= this.cols || row >= this.rows) return true;
    return this.tiles[row * this.cols + col] !== 0;
  }

  solidInRect(x0: number, y0: number, x1: number, y1: number): boolean {
    const c0 = Math.floor((x0 - this.originX) / TILE);
    const c1 = Math.floor((x1 - this.originX - EPS) / TILE);
    const r0 = Math.floor((y0 - this.originY) / TILE);
    const r1 = Math.floor((y1 - this.originY - EPS) / TILE);
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        if (this.isSolid(c, r)) return true;
      }
    }
    return false;
  }

  tileX(col: number): number {
    return this.originX + col * TILE;
  }

  tileY(row: number): number {
    return this.originY + row * TILE;
  }

  get floorY(): number {
    return this.tileY(this.rows - 1);
  }

  get innerLeft(): number {
    return this.tileX(1);
  }

  get innerRight(): number {
    return this.tileX(this.cols - 1);
  }
}
