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

## Consumer integration and releases

- Also run `npm run test:browser` and `npm run lint:package`. CI checks Node 22/24.
- End callbacks distinguish completed, stopped, replaced and cancelled. Repeating
  hosts must only restart on completed; replacement callbacks are synchronous.
- Default color inherits currentColor. EV3 supplies its own palette token default.
- Keep the package name until the owner requests a rename. It identifies the EV3
  app lineage; no hardware integration is implied.
- EV3's adapters preserve component imports, CSS sizing, design tokens and saved
  looks. Persistence and delete/notification/loading/completion events stay there.
- For an update, bump the library version, run checks and `npm pack`, copy the new
  archive to EV3's vendor/, and install it there with npm to update the lockfile.
  Verify Showcase, `node --test tests/logo-feedback.test.cjs`, typecheck and the
  frontend build. Do not keep a second renderer in EV3.
- npm publishing and Git pushes are separate owner-authorized delivery steps;
  neither is part of routine local packaging or verification.
