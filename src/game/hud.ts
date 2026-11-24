import { VIEW_W } from '../config';
import type { AssetStore } from '../render/assets';
import { Palette } from '../render/ui';
import type { Ui } from '../render/ui';
import type { Fighter } from '../sim/fighter';

const PORTRAIT = 26;
const MARGIN = 4;
const TOP = 3;
const BAR_W = 140;
const BAR_H = 10;
const TEXT_GAP = 6;

export function drawHud(ui: Ui, assets: AssetStore, left: Fighter | undefined, right: Fighter | undefined): void {
  drawSlot(ui, assets, left, false);
  drawSlot(ui, assets, right, true);
}

function drawSlot(ui: Ui, assets: AssetStore, fighter: Fighter | undefined, mirrored: boolean): void {
  const boxX = mirrored ? VIEW_W - MARGIN - PORTRAIT : MARGIN;
  ui.box(boxX, TOP, PORTRAIT, PORTRAIT, { border: fighter ? fighter.color : Palette.dim });

  const barX = mirrored ? boxX - TEXT_GAP - BAR_W : boxX + PORTRAIT + TEXT_GAP;
  const textY = TOP + 3;
  const barY = TOP + PORTRAIT - BAR_H - 1;

  if (!fighter) {
    ui.text('?', boxX + 9, TOP + 9, Palette.dim);
    ui.bar(barX, barY, BAR_W, BAR_H, 0, Palette.dim, Palette.dim);
    if (mirrored) ui.textRight('NO OPPONENT', barX + BAR_W, textY, Palette.dim);
    else ui.text('NO OPPONENT', barX, textY, Palette.dim);
    return;
  }

  const cx = boxX + 1 + 12;
  assets.drawFrame(ui.renderer, fighter.portrait, 0, cx, TOP + 1 + 24, fighter.color, 1, mirrored);

  if (mirrored) ui.textRight(fighter.name, barX + BAR_W, textY, fighter.color);
  else ui.text(fighter.name, barX, textY, fighter.color);
  ui.bar(barX, barY, BAR_W, BAR_H, fighter.health / fighter.maxHealth, fighter.color, fighter.color);

  const ready = fighter.dodgeReady;
  const stripY = TOP + PORTRAIT + 1;
  ui.renderer.rect(barX, stripY, BAR_W, 2, Palette.panel);
  ui.renderer.rect(barX, stripY, Math.round(BAR_W * ready), 2, ready >= 1 ? fighter.color : Palette.dim);
}
