# Doods

Fast paced platformer fighting game. TypeScript + WebGL2, built with Vite.

```bash
npm install
npm run dev
```

```bash
npm run build
```

- `Sprites/` art, loaded by path. Missing sprites fall back to generated placeholders.
- `Bills/` sprite and animation bills for the art agent.
- Physics run at 240 Hz, rendering at 60 FPS, animations at 24 FPS.
- Controls: A/D or arrows move, W/Up/Space jump, M2 dodge toward the cursor, M1 or 1-7 attacks, Q/E support, R reset, F3 debug.
