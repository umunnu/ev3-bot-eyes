import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import * as library from '../dist/esm/index.js';
const require = createRequire(import.meta.url);
const shapes = ['rectangle', 'triangle', 'diamond', 'circle', 'hexagon', 'drop'];

test('ESM and CommonJS expose the same typed API without bundling React', () => {
  const commonjs = require('../dist/cjs/index.js');
  assert.deepEqual(Object.keys(commonjs).sort(), Object.keys(library).sort());
  assert.equal(typeof library.CuriousEyes, 'function');
  assert.equal(commonjs.curiousEyesAnimations.length, 10);
});

test('standalone SSR needs no EV3 classes, CSS variables, storage or browser', () => {
  const markup = renderToStaticMarkup(createElement(library.CuriousEyes));
  assert.ok(markup.includes('width="52"') && markup.includes('height="52"'));
  assert.ok(markup.includes('fill:currentColor') && markup.includes('overflow:visible'));
  assert.ok(markup.includes('aria-hidden="true"') && markup.includes('focusable="false"'));
  assert.ok(!markup.includes('var(--') && !markup.includes('ev3-curious-eyes'));
  assert.equal((markup.match(/<path /g) ?? []).length, 2);
  assert.ok(!markup.includes('<filter'));
});

test('colors, size and style work without a stylesheet; filters own unique IDs', () => {
  const props = { size: 96, animated: false, appearance: { color: '#00ffff', edgeBlur: 1, blurColor: '#ff0000' }, style: { background: '#14202a' } };
  const markup = renderToStaticMarkup(createElement('div', null, createElement(library.CuriousEyes, props), createElement(library.CuriousEyes, props)));
  assert.ok(markup.includes('width="96"') && markup.includes('background:#14202a'));
  assert.ok(markup.includes('flood-color="#ff0000"') && markup.includes('fill:#00ffff'));
  assert.ok(markup.includes('in="SourceAlpha"') && markup.includes('in="SourceGraphic"'));
  const ids = [...markup.matchAll(/<filter[^>]+id="([^"]+)"/g)].map(match => match[1]);
  assert.equal(ids.length, 2); assert.equal(new Set(ids).size, 2);
  for (const id of ids) assert.ok(markup.includes(`url(#${id})`));
  const matching = renderToStaticMarkup(createElement(library.CuriousEyes, { appearance: { color: 'rebeccapurple', edgeBlur: 0.5 } }));
  assert.ok(matching.includes('flood-color="rebeccapurple"'));
});

test('all six shapes have finite geometry with equal/opposite rotation', () => {
  for (const shape of shapes) {
    const appearance = { ...library.defaultCuriousEyesAppearance, shape, width: 26, height: 30, gap: 24, rotation: 80 };
    const path = library.eyeShapePath(appearance);
    assert.ok(path.startsWith('M') && path.trim().endsWith('Z'));
    assert.ok(!path.includes('NaN') && !path.includes('Infinity'));
    assert.ok(library.eyeViewBox(appearance).split(' ').map(Number).every(Number.isFinite));
    const markup = renderToStaticMarkup(createElement(library.CuriousEyes, { appearance }));
    assert.ok(markup.includes('rotate(80)') && markup.includes('rotate(-80)'));
  }
});

test('ten distinct reactions have neutral endpoints and reject unknown IDs', () => {
  assert.equal(new Set(library.curiousEyesAnimations.map(animation => animation.id)).size, 10);
  const midpoints = new Set();
  for (const animation of library.curiousEyesAnimations) {
    assert.ok(library.isCuriousEyesAnimation(animation.id));
    assert.equal(library.animationDuration(animation.id), animation.duration);
    for (const time of [0, animation.duration, animation.duration * 2]) {
      const frame = library.sampleEyesAnimation(animation.id, time);
      assert.equal(frame.attention, 0);
      for (const side of [frame.left, frame.right]) {
        for (const [key, expected] of Object.entries(library.neutralEyeExpression)) {
          assert.ok(Math.abs(side[key] - expected) < 1e-10, `${animation.id}: ${key} must settle`);
        }
      }
    }
    midpoints.add(JSON.stringify(library.sampleEyesAnimation(animation.id, animation.duration * 0.4)));
  }
  assert.equal(midpoints.size, 10);
  for (const value of [null, 'missing', 4, {}]) assert.equal(library.isCuriousEyesAnimation(value), false);
});

test('blur does not shrink solid geometry, canvas scale or animated poses', () => {
  for (const shape of shapes) {
    for (const [width, height, gap, rotation] of [[6, 6, 0, 0], [13, 18, 7, 0], [26, 30, 24, 90]]) {
      const crisp = { ...library.defaultCuriousEyesAppearance, shape, width, height, gap, rotation };
      const viewBox = library.eyeViewBox(crisp);
      const halfCanvas = Number(viewBox.split(' ')[2]) / 2;
      for (const edgeBlur of [0.01, 0.5, 1]) {
        const blurred = { ...crisp, edgeBlur, blurColor: '#ff00ff' };
        assert.equal(library.eyeViewBox(blurred), viewBox);
        assert.equal(library.eyeShapePath(blurred), library.eyeShapePath(crisp));
        for (const animation of library.curiousEyesAnimations) {
          for (let i = 0; i <= 20; i++) {
            const frame = library.sampleEyesAnimation(animation.id, animation.duration * i / 20);
            const args = [halfCanvas, frame.yaw, frame.pitch, frame.roll, frame.left, frame.right];
            const fitted = library.fitEyeExpression(blurred, ...args);
            assert.ok(Number.isFinite(fitted) && fitted > 0 && fitted <= 1);
            assert.equal(fitted, library.fitEyeExpression(crisp, ...args));
          }
        }
      }
    }
  }
});

test('server markup places both eyes at their neutral projected positions', () => {
  const appearance = { width: 19, gap: 11, rotation: 30 };
  const markup = renderToStaticMarkup(createElement(library.CuriousEyes, { appearance }));
  const offset = (appearance.width + appearance.gap) / 2;
  for (const [side, x] of [['left', -offset], ['right', offset]]) {
    assert.ok(markup.includes(`data-slot="curious-eye-${side}" transform="${library.eyeTransform(x)}"`));
  }
  assert.equal((markup.match(/transform="scale\(1 1\)"/g) ?? []).length, 2);
});

test('appearance helpers sanitize undefined, non-finite and out-of-range inputs', () => {
  const invalid = { width: undefined, height: NaN, gap: -5, rounding: 300, edgeBlur: Infinity, rotation: -1000, color: '', shape: 'nope' };
  const safe = library.normalizeCuriousEyesAppearance(invalid);
  assert.equal(safe.width, 13); assert.equal(safe.height, 18); assert.equal(safe.gap, 0);
  assert.equal(safe.rounding, 100); assert.equal(safe.edgeBlur, 0); assert.equal(safe.rotation, -180);
  assert.equal(safe.color, 'currentColor'); assert.equal(safe.shape, 'rectangle');
  for (const shape of shapes) {
    for (const width of [undefined, 0, -10, NaN, Infinity, 1e300]) {
      const appearance = { ...invalid, shape, width };
      assert.ok(!/NaN|Infinity/.test(library.eyeShapePath(appearance)));
      assert.ok(library.eyeViewBox(appearance).split(' ').map(Number).every(Number.isFinite));
      assert.ok(Number.isFinite(library.eyeBlurRadius(appearance)));
      const markup = renderToStaticMarkup(createElement(library.CuriousEyes, { appearance }));
      assert.ok(!/NaN|Infinity/.test(markup));
    }
  }
  assert.equal(library.eyeShapePath({ rounding: 300 }), library.eyeShapePath({ rounding: 100 }));
});

test('invalid animation IDs raise descriptive range errors; NaN time stays neutral', () => {
  for (const id of ['nope', null, undefined, {}]) {
    assert.throws(() => library.sampleEyesAnimation(id, 0), RangeError);
    assert.throws(() => library.animationDuration(id), /Unknown eyes animation/);
  }
  for (const elapsed of [NaN, undefined, null, 'later']) assert.deepEqual(library.sampleEyesAnimation('hello', elapsed), library.sampleEyesAnimation('hello', 0));
});
