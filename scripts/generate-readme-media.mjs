// Maintainer-only asset generation. See docs/assets/README.md for prerequisites.
import { mkdir, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';
import { act, createElement, createRef } from 'react';
import { createRoot } from 'react-dom/client';
import { CuriousEyes, curiousEyesAnimations } from '../dist/esm/index.js';

let sharp;
try { ({ default: sharp } = await import('sharp')); }
catch { throw new Error('Install the optional media tool first: npm install --no-save --package-lock=false sharp@0.35.5'); }
const output = new URL('../docs/assets/', import.meta.url);
await mkdir(output, { recursive: true });
const width = 960;
const delay = 50;
const escape = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
const text = (x, y, value, size = 16, color = '#9cabbc', weight = 400, extra = '') =>
  `<text x="${x}" y="${y}" fill="${color}" font-family="Arial, Helvetica, sans-serif" font-size="${size}" font-weight="${weight}" ${extra}>${escape(value)}</text>`;
const svg = (height, content) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${content}</svg>`);
const baseLook = { width: 15, height: 22, gap: 8, rounding: 85, color: '#5cf0dc', edgeBlur: 0.7, blurColor: '#16a999' };

// Run the real React component with a deterministic clock. No animation formulas
// or eye geometry are duplicated here; only the presentation around the eyes.
async function renderer(looks, height, animated = false) {
  const dom = new JSDOM('<div id="root"></div>', { pretendToBeVisual: true });
  let now = 0, next = 1;
  const frames = new Map(), timers = new Map(), saved = new Map();
  const performance = new Proxy(globalThis.performance, { get(target, key) {
    if (key === 'now') return () => now;
    const value = Reflect.get(target, key, target);
    return typeof value === 'function' ? value.bind(target) : value;
  } });
  const globals = { window: dom.window, document: dom.window.document, performance, IS_REACT_ACT_ENVIRONMENT: true };
  for (const [key, value] of Object.entries(globals)) {
    saved.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, { value, writable: true, configurable: true });
  }
  dom.window.innerWidth = width; dom.window.innerHeight = height;
  dom.window.requestAnimationFrame = callback => { const id = next++; frames.set(id, callback); return id; };
  dom.window.cancelAnimationFrame = id => frames.delete(id);
  dom.window.setTimeout = (callback, timeout) => { const id = next++; timers.set(id, { callback, at: now + timeout }); return id; };
  dom.window.clearTimeout = id => timers.delete(id);
  const random = Math.random;
  Math.random = () => 0.1;
  const refs = looks.map(() => createRef());
  const root = createRoot(document.getElementById('root'));
  await act(() => root.render(createElement('div', null, ...looks.map((appearance, i) => createElement(CuriousEyes, { key: i, appearance, animated, size: 160, ref: refs[i] })))));
  const eyes = [...document.querySelectorAll('svg')];
  return {
    play: ids => ids.forEach((id, i) => refs[i].current.play(id)),
    pointer(x, y) { dom.window.dispatchEvent(new dom.window.MouseEvent('pointermove', { clientX: x, clientY: y })); },
    bounds(i, x, y, size) { eyes[i].getBoundingClientRect = () => ({ left: x, top: y, width: size, height: size }); },
    tick(time) {
      now = time;
      for (const [id, timer] of timers) if (timer.at <= time) { timers.delete(id); timer.callback(); }
      const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(callback => callback(time));
    },
    eye(i, x, y, size) {
      const clone = eyes[i].cloneNode(true);
      for (const [key, value] of Object.entries({ xmlns: 'http://www.w3.org/2000/svg', x, y, width: size, height: size })) clone.setAttribute(key, String(value));
      return clone.outerHTML;
    },
    async close() {
      await act(() => root.unmount()); dom.window.close(); Math.random = random;
      for (const [key, descriptor] of saved) {
        if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key];
      }
    },
  };
}

async function animate(name, height, count, renderFrame, previewAt = 0) {
  const frames = [];
  for (let i = 0; i < count; i++) {
    const image = svg(height, renderFrame(i * delay));
    frames.push(await sharp(image).ensureAlpha().raw().toBuffer());
    if (i === previewAt) await sharp(image).png().toFile(fileURLToPath(new URL(`${name}.png`, output)));
  }
  await sharp(Buffer.concat(frames), { raw: { width, height: height * count, channels: 4, pageHeight: height } })
    .gif({ delay: Array(count).fill(delay), loop: 0, colors: 160, dither: 0, effort: 7, interFrameMaxError: 2 })
    .toFile(fileURLToPath(new URL(`${name}.gif`, output)));
  const metadata = await sharp(fileURLToPath(new URL(`${name}.gif`, output)), { animated: true }).metadata();
  const duration = metadata.delay.reduce((total, value) => total + value, 0);
  if (metadata.pages < 2 || duration !== count * delay) throw new Error(`Invalid GIF timing: ${name}`);
  console.log(`${name}.gif: ${Math.round((await stat(new URL(`${name}.gif`, output))).size / 1024)} KiB`);
}

const hero = await renderer([baseLook], 320, true);
hero.bounds(0, 638, 16, 284);
try {
  await animate('hero', 320, 144, time => {
    const p = Math.min(time / 5600, 1);
    const ease = Math.sin(p * Math.PI) ** 2;
    const x = 780 + 154 * Math.sin(p * Math.PI * 4) * ease;
    const y = 158 - 105 * Math.sin(p * Math.PI * 2) * ease;
    hero.pointer(x, y); hero.tick(time);
    return `<defs><linearGradient id="bg" x2="1" y2="0.6"><stop stop-color="#111b2b"/><stop offset="1" stop-color="#152b31"/></linearGradient><radialGradient id="aura"><stop stop-color="#32b7a8" stop-opacity=".1"/><stop offset="1" stop-color="#32b7a8" stop-opacity="0"/></radialGradient></defs>
      <rect width="960" height="320" rx="24" fill="url(#bg)"/>
      <ellipse cx="782" cy="150" rx="250" ry="220" fill="url(#aura)"/>
      <rect x="32" y="34" width="145" height="27" rx="13" fill="#5cf0dc" fill-opacity=".09"/>
      ${text(47, 52, 'EV3 / BOT EYES', 11, '#77dfd2', 700, 'letter-spacing="1.6"')}
      ${text(32, 128, 'Hello, human.', 53, '#f4f8fc', 700, 'letter-spacing="-2"')}
      ${text(34, 169, 'Give your agent a little personality.', 20, '#c9d5df')}
      ${text(34, 198, 'It looks. It blinks. It feels alive.', 17, '#94a9b8')}
      ${text(34, 274, 'REACT 19', 11, '#92a6b9', 700, 'letter-spacing="1.2"')}
      <circle cx="122" cy="270" r="2" fill="#4e717b"/>
      ${text(139, 274, 'SVG', 11, '#92a6b9', 700, 'letter-spacing="1.2"')}
      <circle cx="183" cy="270" r="2" fill="#4e717b"/>
      ${text(200, 274, '10 REACTIONS', 11, '#92a6b9', 700, 'letter-spacing="1.2"')}
      ${hero.eye(0, 638, 16, 284)}
      <path d="M 0 0 L 0 18 L 5 13 L 9 22 L 13 20 L 9 12 L 16 12 Z" transform="translate(${x.toFixed(2)} ${y.toFixed(2)})" fill="#effffa" stroke="#142e34" stroke-width="1.5"/>
      ${text(780, 292, 'CURIOUS BY DEFAULT', 10, '#80b1b1', 700, 'letter-spacing="2" text-anchor="middle"')}`;
  });
} finally { await hero.close(); }

const colors = ['#60efdc', '#a8d2ff', '#ff9d8d', '#f8d780', '#ccb1ff', '#b7c9e1', '#e7bdff', '#ffbe8c', '#a4dbff', '#aff287'];
const moods = await renderer(colors.map(color => ({ ...baseLook, width: 14, height: 19, color, blurColor: color, edgeBlur: 0.35 })), 398);
moods.play(curiousEyesAnimations.map(animation => animation.id));
try {
  await animate('reactions', 398, 66, time => {
    moods.tick(time);
    return `<rect width="960" height="398" rx="20" fill="#101b29"/>
      ${curiousEyesAnimations.map((animation, i) => {
        const x = 16 + (i % 5) * 188, y = 16 + Math.floor(i / 5) * 184;
        return `<rect x="${x}" y="${y}" width="176" height="174" rx="14" fill="#162435"/>
          ${moods.eye(i, x + 34, y + 1, 108)}
          ${text(x + 88, y + 128, animation.id, 16, '#e5edf6', 700, 'text-anchor="middle"')}
          ${text(x + 88, y + 151, animation.scenario, 11, '#91a6bd', 400, 'text-anchor="middle"')}`;
      }).join('')}`;
  }, 16);
} finally { await moods.close(); }

const variants = [
  { label: 'Rectangle', caption: 'Cyan core / teal halo', bg: '#152932', fg: '#e2f2f3', muted: '#9cb8bd', ...baseLook },
  { label: 'Triangle', caption: 'Coral / warm white', bg: '#fff0e8', fg: '#543b35', muted: '#926f64', shape: 'triangle', width: 19, height: 20, gap: 8, rounding: 28, rotation: -12, color: '#ec725b', edgeBlur: 0.15, blurColor: '#ee7968' },
  { label: 'Diamond', caption: 'Lilac core / violet halo', bg: '#211e3b', fg: '#f1eaff', muted: '#b6a5d9', shape: 'diamond', width: 18, height: 24, gap: 10, rounding: 65, color: '#c5adff', edgeBlur: 0.65, blurColor: '#7963f6' },
  { label: 'Circle', caption: 'Ink / clean edges', bg: '#edf2f1', fg: '#233634', muted: '#627f78', shape: 'circle', width: 17, height: 17, gap: 9, color: '#152a2b', edgeBlur: 0 },
  { label: 'Hexagon', caption: 'Lime core / mint halo', bg: '#1d2c25', fg: '#e7f5de', muted: '#b0c39e', shape: 'hexagon', width: 18, height: 21, gap: 8, rounding: 14, rotation: 10, color: '#c5f076', edgeBlur: 0.5, blurColor: '#51bc92' },
  { label: 'Drop', caption: 'Blue core / lavender halo', bg: '#eef0ff', fg: '#353b60', muted: '#74799a', shape: 'drop', width: 17, height: 23, gap: 10, rounding: 50, rotation: -16, color: '#5479ee', edgeBlur: 0.4, blurColor: '#9d80ec' },
];
const shapes = await renderer(variants, 450);
try {
  const content = `<rect width="960" height="450" rx="20" fill="#f6f8fa"/>${variants.map((variant, i) => {
    const x = 14 + (i % 3) * 314, y = 14 + Math.floor(i / 3) * 218;
    return `<rect x="${x}" y="${y}" width="304" height="208" rx="14" fill="${variant.bg}"/>
      ${shapes.eye(i, x + 87, y + 1, 130)}
      ${text(x + 152, y + 157, variant.label, 18, variant.fg, 700, 'text-anchor="middle"')}
      ${text(x + 152, y + 181, variant.caption, 12, variant.muted, 400, 'text-anchor="middle"')}`;
  }).join('')}`;
  await sharp(svg(450, content)).png().toFile(fileURLToPath(new URL('shapes.png', output)));
  console.log('shapes.png generated');
} finally { await shapes.close(); }
