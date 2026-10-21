# Changelog

## Unreleased

- Empty or whitespace `blurColor` values follow the eye color, matching the `null` default.
- Mounting without `requestAnimationFrame` (jsdom without `pretendToBeVisual`) no longer throws; the eyes stay still and `play` returns false.
- Document the StrictMode development `cancelled` event and offscreen-mount playback before the first visibility report.

## 0.1.1

- Preserve mount greetings across the initial IntersectionObserver report; use the latest visibility entry.
- Render neutral eye transforms on the server to avoid hydration jumps and misplaced no-JavaScript eyes.
- Preserve active reactions when `animated` changes and report completed/stopped/replaced/cancelled callbacks.
- Support environments without matchMedia or IntersectionObserver and clean up active playback on unmount.
- Normalize appearance inputs, clamp geometry and throw descriptive errors for unknown animation IDs.
- Inherit text color with currentColor; keep independent halo colors and outward-only blur.
- Share pointer tracking and defer layout reads until an animation frame.
- Add jsdom and Chromium regressions, CI, package/type linting and legacy TypeScript subpath mappings.
- Build CommonJS with Node16 resolution and remove the consumer Node engine restriction.
- Add the MIT license, public scoped-package configuration and external-facing documentation.

## 0.1.0

- Extract the reusable React 19 eye renderer, six shapes and ten one-shot reactions.
- Provide ESM/CommonJS builds, TypeScript declarations and a standalone playground.
