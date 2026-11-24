import { MAX_STEPS_PER_FRAME, RENDER_FPS, SIM_DT } from '../config';

export interface LoopHandlers {
  step(): void;
  render(): void;
}

export interface LoopStats {
  stepsLastFrame: number;
}

export function startLoop(handlers: LoopHandlers): LoopStats {
  const stats: LoopStats = { stepsLastFrame: 0 };
  const renderInterval = 1 / RENDER_FPS;
  let last = performance.now();
  let simAcc = 0;
  let renderAcc = renderInterval;

  const frame = (now: number) => {
    requestAnimationFrame(frame);
    const elapsed = Math.min((now - last) / 1000, 0.25);
    last = now;
    simAcc += elapsed;
    renderAcc += elapsed;

    let steps = 0;
    while (simAcc >= SIM_DT && steps < MAX_STEPS_PER_FRAME) {
      handlers.step();
      simAcc -= SIM_DT;
      steps++;
    }
    if (steps === MAX_STEPS_PER_FRAME) simAcc = 0;
    stats.stepsLastFrame = steps;

    if (renderAcc >= renderInterval - 0.001) {
      renderAcc = Math.min(renderAcc - renderInterval, renderInterval);
      handlers.render();
    }
  };

  requestAnimationFrame(frame);
  return stats;
}
