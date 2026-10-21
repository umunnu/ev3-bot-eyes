import assert from 'node:assert/strict';
import { test } from 'node:test';
import { JSDOM } from 'jsdom';
import { StrictMode, act, createElement, createRef, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { CuriousEyes, animationDuration } from '../dist/esm/index.js';

async function fixture(run, { apis = true, visual = true } = {}) {
  const dom = new JSDOM('<div id="root"></div>', { pretendToBeVisual: visual });
  const saved = new Map();
  for (const [key, value] of Object.entries({ window: dom.window, document: dom.window.document, IS_REACT_ACT_ENVIRONMENT: true, performance: new Proxy(globalThis.performance, { get(target, key) { if (key === 'now') return () => now; const value = Reflect.get(target, key, target); return typeof value === 'function' ? value.bind(target) : value; } }) })) {
    saved.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, { value, writable: true, configurable: true });
  }
  let now = 0, nextId = 1;
  const frames = new Map(), timers = new Map(), observers = [], events = [];
  const media = new dom.window.EventTarget(); media.matches = false;
  if (apis) dom.window.matchMedia = () => media;
  class Observer {
    constructor(callback) { this.callback = callback; this.disconnected = false; observers.push(this); }
    observe() {}
    disconnect() { this.disconnected = true; }
    emit(...states) { this.callback(states.map(isIntersecting => ({ isIntersecting }))); }
  }
  saved.set('IntersectionObserver', Object.getOwnPropertyDescriptor(globalThis, 'IntersectionObserver'));
  Object.defineProperty(globalThis, 'IntersectionObserver', { value: apis ? Observer : undefined, configurable: true });
  // Plain jsdom (no pretendToBeVisual) has no animation frame API at all.
  if (visual) {
    dom.window.requestAnimationFrame = callback => { const id = nextId++; frames.set(id, callback); return id; };
    dom.window.cancelAnimationFrame = id => frames.delete(id);
  }
  dom.window.setTimeout = callback => { const id = nextId++; timers.set(id, callback); return id; };
  dom.window.clearTimeout = id => timers.delete(id);
  const ref = createRef();
  let root = createRoot(document.getElementById('root'));
  let props = { ref, onAnimationEnd: (...event) => events.push(event) };
  const render = async patch => { props = { ...props, ...patch }; await act(() => root.render(createElement(CuriousEyes, props))); };
  const advance = delta => { now += delta; const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(callback => callback(now)); };
  try {
    await run({ render, ref, events, observers, media, frames, timers, advance, window: dom.window,
      unmount: async () => { await act(() => root.unmount()); root = null; },
      mountGreeting: async ({ strict = false } = {}) => {
        function Greeting() { useEffect(() => { ref.current.play('hello'); }, []); return createElement(CuriousEyes, props); }
        await act(() => root.render(strict ? createElement(StrictMode, null, createElement(Greeting)) : createElement(Greeting)));
      },
    });
  } finally {
    if (root) await act(() => root.unmount());
    dom.window.close();
    for (const [key, descriptor] of saved) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  }
}

test('mount greeting survives the initial visible report; last observer entry wins', async () => fixture(async f => {
  await f.mountGreeting();
  f.observers[0].emit(true);
  assert.deepEqual(f.events, []);
  f.advance(animationDuration('hello') - 1);
  assert.deepEqual(f.events, []);
  f.advance(1);
  assert.deepEqual(f.events, [['hello', 'completed']]);
  f.observers[0].emit(false, true);
  assert.equal(f.ref.current.play('thinking'), true);
  f.observers[0].emit(true, false);
  assert.deepEqual(f.events.at(-1), ['thinking', 'cancelled']);
  assert.equal(f.ref.current.play('hello'), false);
}));

test('an offscreen mount accepts playback until the first observer report cancels it', async () => fixture(async f => {
  await f.mountGreeting();
  assert.equal(document.querySelector('svg').dataset.animation, 'hello');
  f.observers[0].emit(false);
  assert.deepEqual(f.events, [['hello', 'cancelled']]);
  assert.equal(f.ref.current.play('hello'), false);
}));

test('StrictMode development remounts report one cancelled greeting before the real run', async () => fixture(async f => {
  await f.mountGreeting({ strict: true });
  assert.deepEqual(f.events, [['hello', 'cancelled']]);
  f.advance(animationDuration('hello'));
  assert.deepEqual(f.events, [['hello', 'cancelled'], ['hello', 'completed']]);
}));

test('animated toggles preserve active playback and use the latest callback', async () => fixture(async f => {
  await f.render({ animated: true });
  f.ref.current.play('thinking'); f.advance(700);
  await f.render({ animated: false });
  assert.equal(f.observers.length, 1);
  assert.equal(document.querySelector('svg').dataset.animation, 'thinking');
  assert.deepEqual(f.events, []);
  await f.render({ animated: true, onAnimationEnd: (id, reason) => f.events.push(['latest', id, reason]) });
  f.advance(1700);
  assert.deepEqual(f.events, [['latest', 'thinking', 'completed']]);
}));

test('callbacks distinguish replacement, stop, completion and cancellation without reentrant crashes', async () => fixture(async f => {
  await f.render({ onAnimationEnd: (id, reason) => {
    f.events.push([id, reason]);
    if (reason === 'completed' && id === 'thinking') f.ref.current.play('thinking');
    if (reason === 'replaced' && id === 'alert') f.ref.current.stop();
  } });
  f.ref.current.play('thinking'); f.advance(2400);
  assert.equal(document.querySelector('svg').dataset.animation, 'thinking');
  f.ref.current.play('scared');
  assert.equal(document.querySelector('svg').dataset.animation, 'scared');
  f.ref.current.stop(); f.ref.current.stop();
  f.ref.current.play('alert'); f.ref.current.play('dance');
  assert.equal(document.querySelector('svg').dataset.animation, 'idle');
  assert.deepEqual(f.events, [['thinking', 'completed'], ['thinking', 'replaced'], ['scared', 'stopped'], ['alert', 'replaced'], ['dance', 'stopped']]);
  f.ref.current.play('hello');
  f.media.matches = true; f.media.dispatchEvent(new f.window.Event('change'));
  assert.deepEqual(f.events.at(-1), ['hello', 'cancelled']);
  assert.equal(f.ref.current.play('dance'), false);
  assert.equal(f.frames.size, 0); assert.equal(f.timers.size, 0);
}));

test('missing matchMedia and IntersectionObserver fall back to visible, motion-enabled eyes', async () => fixture(async f => {
  await f.render();
  assert.equal(f.ref.current.play('hello'), true);
  f.advance(1500);
  assert.deepEqual(f.events, [['hello', 'completed']]);
}, { apis: false }));

test('without animation frames the eyes render still, refuse playback and unmount cleanly', async () => {
  await fixture(async f => {
    assert.equal(typeof f.window.cancelAnimationFrame, 'undefined');
    await f.render();
    assert.match(document.querySelector('[data-slot="curious-eye-left"]').getAttribute('transform'), /^matrix\(/);
    assert.equal(f.ref.current.play('hello'), false);
    f.ref.current.stop();
    await f.render({ animated: false });
    await f.unmount();
    assert.deepEqual(f.events, []);
  }, { visual: false });
  await fixture(async f => {
    delete f.window.requestAnimationFrame; delete f.window.cancelAnimationFrame;
    assert.equal(typeof f.window.requestAnimationFrame, 'undefined');
    await f.render();
    assert.equal(document.hidden, false);
    assert.equal(f.ref.current.play('hello'), false);
    await f.unmount();
    assert.deepEqual(f.events, []);
  });
});

test('hidden documents cancel playback; unmount cancels work and cleans observers', async () => fixture(async f => {
  await f.render();
  f.ref.current.play('thinking');
  Object.defineProperty(document, 'hidden', { value: true, configurable: true });
  document.dispatchEvent(new f.window.Event('visibilitychange'));
  assert.deepEqual(f.events, [['thinking', 'cancelled']]);
  assert.equal(f.ref.current.play('hello'), false);
  Object.defineProperty(document, 'hidden', { value: false });
  document.dispatchEvent(new f.window.Event('visibilitychange'));
  f.ref.current.play('dance');
  const handle = f.ref.current;
  await f.unmount();
  assert.deepEqual(f.events.at(-1), ['dance', 'cancelled']);
  assert.equal(handle.play('hello'), false);
  assert.equal(f.frames.size, 0); assert.equal(f.timers.size, 0);
  assert.equal(f.observers[0].disconnected, true);
}));

test('pointer bursts defer layout reads until one animation frame; unmount removes the shared listener', async () => fixture(async f => {
  let added = 0, removed = 0, reads = 0;
  const add = f.window.addEventListener.bind(f.window), remove = f.window.removeEventListener.bind(f.window);
  f.window.addEventListener = (type, ...args) => { if (type === 'pointermove') added++; add(type, ...args); };
  f.window.removeEventListener = (type, ...args) => { if (type === 'pointermove') removed++; remove(type, ...args); };
  await f.render();
  document.querySelector('svg').getBoundingClientRect = () => { reads++; return { left: 0, top: 0, width: 52, height: 52 }; };
  for (let i = 0; i < 20; i++) f.window.dispatchEvent(new f.window.MouseEvent('pointermove', { clientX: i * 20, clientY: 200 }));
  assert.equal(reads, 0); assert.equal(f.frames.size, 1);
  f.advance(16); assert.equal(reads, 1);
  await f.unmount();
  assert.equal(added, 1); assert.equal(removed, 1);
}));
