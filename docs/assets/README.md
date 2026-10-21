# README media

These previews use the actual `CuriousEyes` React component and its animation
clock, rendered through jsdom and rasterized from its SVG output. The generator
adds only the surrounding cards, labels, background and visible cursor.

- `hero.gif`: 7.2-second cursor-following and natural-blink loop, 960 × 320.
- `reactions.gif`: all ten one-shot reactions at their real durations, 960 × 398.
- `shapes.png`: the six supported shapes with different dimensions, rotation,
  rounding, eye colors and halo colors, on both light and dark surfaces.
- `hero.png` and `reactions.png`: still alternatives linked from the README.

## Regenerate

From the repository root, with its development dependencies installed:

```sh
npm ci
npm install --no-save --package-lock=false sharp@0.35.5
npm run build
node scripts/generate-readme-media.mjs
```

Sharp is an optional maintainer tool, not a library dependency. These commands
do not add it to the package manifest or lockfile. The script uses a fixed clock
and blink timing so frames are reproducible; font rendering may differ slightly
between operating systems. Assets loop at 20 fps and use an optimized GIF palette.

Review the full loops and the still previews after regenerating. Keep the solid
eye shapes defined, preserve outward halo overflow, and avoid cropping any pose.
