import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { CuriousEyes, curiousEyesAnimations } from '../../dist/esm/index.js';

let browser, server, url;
before(async () => {
  server = await createServer({ configFile: false, root: fileURLToPath(new URL('./fixture/', import.meta.url)), server: { host: '127.0.0.1', port: 5189, strictPort: true }, esbuild: { jsx: 'automatic' } });
  await server.listen(); url = `http://127.0.0.1:${server.httpServer.address().port}`;
  browser = await chromium.launch({ headless: true });
});
after(async () => { await browser?.close(); await server?.close(); });
async function withPage(run) {
  const page = await browser.newPage();
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error' && /hydrat|mismatch|server.render/i.test(message.text())) errors.push(message.text()); });
  try {
    await page.goto(url);
    await page.waitForFunction(() => window.eyesFixture);
    await run(page);
    assert.deepEqual(errors, []);
  } finally { await page.close(); }
}

test('real initial observer notification does not cancel a mount greeting in StrictMode', async () => withPage(async page => {
  await page.evaluate(() => window.eyesFixture.mount());
  await page.waitForFunction(() => document.querySelector('svg')?.dataset.animation === 'hello');
  await page.waitForTimeout(150);
  assert.equal(await page.locator('svg').getAttribute('data-animation'), 'hello');
  assert.equal(await page.evaluate(() => window.eyesFixture.events.filter(event => event.reason === 'completed').length), 0);
  await page.waitForFunction(() => window.eyesFixture.events.some(event => event.id === 'hello' && event.reason === 'completed'));
  assert.equal(await page.locator('svg').getAttribute('data-animation'), 'idle');
}));

test('real playback survives animated toggles and every reaction can finish', async () => withPage(async page => {
  await page.evaluate(() => window.eyesFixture.mount({ greeting: false }));
  await page.waitForFunction(() => document.querySelector('svg'));
  await page.waitForTimeout(50);
  assert.equal(await page.evaluate(() => window.eyesFixture.play('thinking')), true);
  await page.waitForTimeout(100);
  await page.evaluate(() => window.eyesFixture.update(false));
  await page.waitForTimeout(50);
  assert.equal(await page.locator('svg').getAttribute('data-animation'), 'thinking');
  assert.deepEqual(await page.evaluate(() => window.eyesFixture.events), []);
  await page.waitForFunction(() => window.eyesFixture.events.some(event => event.id === 'thinking' && event.reason === 'completed'));
  for (const { id, duration } of curiousEyesAnimations) {
    assert.equal(await page.evaluate(id => window.eyesFixture.play(id), id), true);
    await page.waitForFunction(id => window.eyesFixture.events.some(event => event.id === id && event.reason === 'completed'), id, { timeout: duration + 2000 });
  }
}));

test('SSR neutral positions survive hydration without a jump or hydration error', async () => withPage(async page => {
  const markup = renderToString(createElement(CuriousEyes, { animated: false, size: 120 }));
  await page.locator('#root').evaluate((node, html) => { node.innerHTML = html; }, markup);
  const before = await page.locator('[data-slot="curious-eye-left"], [data-slot="curious-eye-right"]').evaluateAll(nodes => nodes.map(node => {
    const bounds = node.getBoundingClientRect(); return [bounds.x, bounds.y, bounds.width, bounds.height];
  }));
  assert.ok(before[1][0] > before[0][0]); assert.ok(before.every(bounds => bounds[0] >= 0 && bounds[1] >= 0));
  await page.evaluate(markup => window.eyesFixture.hydrate(markup), markup);
  await page.waitForTimeout(100);
  const after = await page.locator('[data-slot="curious-eye-left"], [data-slot="curious-eye-right"]').evaluateAll(nodes => nodes.map(node => {
    const bounds = node.getBoundingClientRect(); return [bounds.x, bounds.y, bounds.width, bounds.height];
  }));
  for (let i = 0; i < 2; i++) for (let j = 0; j < 4; j++) assert.ok(Math.abs(before[i][j] - after[i][j]) < 0.02);
}));

test('offscreen and reduced-motion transitions cancel playback and disable new reactions', async () => withPage(async page => {
  await page.evaluate(() => window.eyesFixture.mount({ greeting: false }));
  await page.waitForFunction(() => document.querySelector('svg'));
  await page.waitForTimeout(50);
  await page.evaluate(() => window.eyesFixture.play('dance'));
  await page.locator('#root').evaluate(node => { node.style.marginTop = '200vh'; });
  await page.waitForFunction(() => window.eyesFixture.events.some(event => event.id === 'dance' && event.reason === 'cancelled'));
  assert.equal(await page.evaluate(() => window.eyesFixture.play('hello')), false);
  await page.locator('#root').evaluate(node => { node.style.marginTop = '0px'; });
  await page.waitForTimeout(100);
  assert.equal(await page.evaluate(() => window.eyesFixture.play('alert')), true);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.waitForFunction(() => window.eyesFixture.events.some(event => event.id === 'alert' && event.reason === 'cancelled'));
  assert.equal(await page.evaluate(() => window.eyesFixture.play('hello')), false);
}));
