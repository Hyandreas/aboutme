import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { startReconstructionReview } from './hyacinth-reconstruction-review.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.HYACINTH_PLAYWRIGHT_PATH || 'playwright');
const sharp = require('sharp');
const out = path.resolve('research/hyacinth-reconstruction');
const review = await startReconstructionReview();
let browser;
try {
  browser = await chromium.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto(review.url + (process.argv.includes('--no-depth') ? '/?noDepth=1' : ''), { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__reconstructionReview, null, { polling: 100, timeout: 30000 });
  const ready = await page.evaluate(() => ({ ready: window.__reconstructionReview.ready, error: window.__reconstructionReview.error, hasGeometry: window.__reconstructionReview.hasGeometry }));
  assert.equal(ready.error, undefined);
  assert.equal(ready.ready, true);
  assert.equal(ready.hasGeometry, true, 'The active renderer still uses a photographic cylinder rather than reconstructed petal surfaces');
  if (process.argv.includes('--assert-geometry')) {
    console.log('Active renderer uses reconstructed geometry.');
  } else {
    await mkdir(out, { recursive: true });
    const capture = async name => {
      const data = await page.evaluate(view => window.__reconstructionReview.render(view), name);
      const pixels = Buffer.from(data.split(',')[1], 'base64');
      await writeFile(path.join(out, name + '.png'), pixels);
      return pixels;
    };
    const current = await capture('entry');
    if (!process.argv.includes('--entry-only')) for (const view of ['quarter', 'left', 'right', 'rear', 'elevated']) await capture(view);
    const detail = await page.evaluate(() => {
      const r = window.__reconstructionReview.api.plant.reconstruction;
      return { frontDots: r.seeds.length, hiddenDots: r.hiddenSeeds.length, surfaces: r.surfaces.length, petalSurfaces: r.surfaces.filter(p => p.kind === 'petal').length };
    });
    await page.goto(review.url + '/?original=1', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.__reconstructionReview?.ready, null, { polling: 100, timeout: 30000 });
    const originalData = await page.evaluate(() => window.__reconstructionReview.render('entry'));
    const original = Buffer.from(originalData.split(',')[1], 'base64');
    await writeFile(path.join(out, 'original-entry.png'), original);
    const a = await sharp(original).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    const b = await sharp(current).removeAlpha().raw().toBuffer();
    let changed = 0, totalError = 0;
    const difference = Buffer.alloc(a.data.length);
    for (let i = 0; i < a.data.length; i += 3) {
      let max = 0;
      for (let c = 0; c < 3; c++) { const d = Math.abs(a.data[i + c] - b[i + c]); max = Math.max(max, d); totalError += d; difference[i + c] = Math.min(255, d * 6); }
      if (max > 8) changed++;
    }
    await sharp(difference, { raw: { width: a.info.width, height: a.info.height, channels: 3 } }).png().toFile(path.join(out, 'entry-difference.png'));
    const metrics = { ...detail, changedPixelFraction: changed / (a.info.width * a.info.height), meanChannelError: totalError / a.data.length, errors };
    await writeFile(path.join(out, 'diagnostics.json'), JSON.stringify(metrics, null, 2) + '\n');
    console.log(JSON.stringify(metrics, null, 2));
    assert.deepEqual(errors, []);
    assert.ok(metrics.changedPixelFraction < .005, 'The entry view has drifted visibly from the original');
  }
} finally {
  await browser?.close();
  await review.close();
}
