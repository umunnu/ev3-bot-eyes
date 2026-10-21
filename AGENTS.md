# EV3 Bot Eyes contributor guidance

- This repository owns the reusable eye renderer, geometry, types and ten animations.
- Runtime dependencies must remain independent of EV3, Tailwind, browser storage,
  app events and backend services. React is a peer dependency.
- Keep React 19 ref semantics, ESM/CommonJS exports and declarations working.
- Preserve public animation IDs, shape IDs and appearance fields across changes.
- Blur must paint outside the solid eye size. It must not change the viewBox,
  core dimensions or animation fitting. Keep eye and halo colors independent.
- Respect reduced motion, visibility and offscreen playback; clean up timers,
  animation frames and listeners on unmount.
- Keep the standalone playground and README consistent with the API.
- Verify with `npm test`, `npm run typecheck`, `npm run build:demo` and `npm pack`.
- EV3 consumes a packed archive; update and verify that consumer when delivering
  a new package version. EV3 adapters keep its palette, persistence and actions.
