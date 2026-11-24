import '@fontsource/press-start-2p/latin-400.css';
import './content/character';
import './content/fx';
import { clipRegistry } from './content/clips';
import { DeviceController } from './core/input';
import { startLoop } from './core/loop';
import { Game } from './game/game';
import { AssetStore } from './render/assets';
import { PixelFont } from './render/font';
import { Renderer } from './render/renderer';
import { Ui } from './render/ui';

function fatal(message: string): void {
  const el = document.getElementById('fatal');
  if (!el) return;
  el.textContent = message;
  el.style.display = 'flex';
}

async function boot(): Promise<void> {
  const canvas = document.getElementById('game') as HTMLCanvasElement;
  const renderer = new Renderer(canvas);
  const [font, assets] = await Promise.all([
    PixelFont.create(renderer),
    AssetStore.load(renderer, clipRegistry.values()),
  ]);
  const ui = new Ui(renderer, font);
  const device = new DeviceController(window);
  const game = new Game(renderer, assets, ui, device);
  game.stats = startLoop({
    step: () => game.step(),
    render: () => game.render(),
  });
  canvas.focus();
}

boot().catch((err) => {
  console.error(err);
  fatal(err instanceof Error ? err.message : String(err));
});
