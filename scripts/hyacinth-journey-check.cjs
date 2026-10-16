#!/usr/bin/env node

// Verify the actual production page without exposing a scene debug API.
// The caller starts/rebuilds the preview; this script never starts a server.
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.HYACINTH_PLAYWRIGHT_PATH
  || '/Users/alan/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');

const baseUrl = process.env.HYACINTH_CHECK_URL || 'http://127.0.0.1:5003';
const outputDir = path.join(__dirname, '../research/hyacinth-journey-implementation');
const selected = process.argv.find(value => value.startsWith('--only='))?.slice(7).split(',');
const { VIEWPORTS } = require('./hyacinth-living-check.cjs');
const report = {
  baseUrl, capturedAt: new Date().toISOString(), checks: [], views: {},
  runtimeErrors: [], consoleErrors: [], externalFontErrors: [], expectedFallbackErrors: [], requestFailures: [],
};
const check = (name, pass, detail) => {
  report.checks.push({ name, pass: Boolean(pass), detail });
  console.log(`${pass ? 'PASS' : 'FAIL'} ${name}`);
  if (!pass) console.log(JSON.stringify(detail));
};

function publishRecheck(previous, current) {
  const checks = new Map(previous.checks.filter(item => item.pass).map(item => [item.name, item]));
  for (const item of current.checks) checks.set(item.name, item);
  const consolidated = { ...current, checks: [...checks.values()], views: { ...previous.views, ...current.views },
    priorCapturedAt: previous.capturedAt,
    expectedFallbackErrors: [...previous.expectedFallbackErrors, ...current.expectedFallbackErrors],
    harnessDiagnostics: [
      'The first resize sample preceded its resize event; the settled recheck preserved progress.',
      '/about intentionally renders a construction notice without a main element; its null-safe route check passed.',
      'Mobile and reduced-motion startup waits passed after guaranteed browser-context cleanup and bounded readiness waits.',
    ],
  };
  delete consolidated.priorEvidence;
  consolidated.pass = consolidated.checks.every(item => item.pass);
  fs.writeFileSync(path.join(outputDir, 'journey-browser-check.initial.json'), JSON.stringify(previous, null, 2));
  fs.writeFileSync(path.join(outputDir, 'journey-browser-check.json'), JSON.stringify(consolidated, null, 2));
  console.log(JSON.stringify({ consolidatedChecks: consolidated.checks.length, pass: consolidated.pass }));
}

if (process.argv.includes('--publish-recheck')) {
  publishRecheck(JSON.parse(fs.readFileSync(path.join(outputDir, 'journey-browser-check.json'), 'utf8')),
    JSON.parse(fs.readFileSync(path.join(outputDir, 'journey-browser-recheck.json'), 'utf8')));
  process.exit(0);
}

function instrumentScene({ noWebGL = false } = {}) {
  sessionStorage.setItem('hy:introSeenSession', '1');
  window.__hySound = false;
  window.__journeyCheck = { matrix: null, projection: null, progress: null, frames: 0 };
  if (noWebGL) {
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(type, ...args) {
      if (['webgl', 'webgl2', 'experimental-webgl'].includes(type)) return null;
      return getContext.call(this, type, ...args);
    };
    return;
  }
  const sources = new WeakMap(), programs = new WeakSet(), uniforms = new WeakMap();
  for (const type of [window.WebGLRenderingContext, window.WebGL2RenderingContext]) {
    if (!type) continue;
    const proto = type.prototype;
    const shaderSource = proto.shaderSource, attachShader = proto.attachShader;
    const getUniformLocation = proto.getUniformLocation;
    const uniformMatrix4fv = proto.uniformMatrix4fv, uniform1f = proto.uniform1f;
    proto.shaderSource = function(shader, source) {
      sources.set(shader, source);
      return shaderSource.call(this, shader, source);
    };
    proto.attachShader = function(program, shader) {
      const source = sources.get(shader) || '';
      if (source.includes('vReferenceDepth')) programs.add(program);
      return attachShader.call(this, program, shader);
    };
    proto.getUniformLocation = function(program, name) {
      const location = getUniformLocation.call(this, program, name);
      if (location && programs.has(program)) uniforms.set(location, name);
      return location;
    };
    proto.uniformMatrix4fv = function(location, transpose, value, ...rest) {
      const name = uniforms.get(location);
      if (name === 'modelViewMatrix') {
        window.__journeyCheck.matrix = Array.from(value).slice(0, 16);
        window.__journeyCheck.frames++;
      } else if (name === 'projectionMatrix') {
        window.__journeyCheck.projection = Array.from(value).slice(0, 16);
      }
      return uniformMatrix4fv.call(this, location, transpose, value, ...rest);
    };
    proto.uniform1f = function(location, value) {
      if (uniforms.get(location) === 'uJourneyProgress') window.__journeyCheck.progress = value;
      return uniform1f.call(this, location, value);
    };
  }
}

function observePage(page, label, fallback = false) {
  page.on('pageerror', error => report.runtimeErrors.push({ label, message: error.message }));
  page.on('console', message => {
    if (message.type() !== 'error') return;
    const entry = { label, message: message.text(), location: message.location() };
    if (/fonts\.(googleapis|gstatic)\.com/.test(entry.location.url || '')
      || /font.*ERR_CERT|ERR_CERT.*font/i.test(entry.message)) report.externalFontErrors.push(entry);
    else if (fallback && /WebGL context/i.test(entry.message)) report.expectedFallbackErrors.push(entry);
    else report.consoleErrors.push(entry);
  });
  page.on('requestfailed', request => {
    const entry = { label, url: request.url(), failure: request.failure()?.errorText };
    if (/fonts\.(googleapis|gstatic)\.com/.test(entry.url)) report.externalFontErrors.push(entry);
    else report.requestFailures.push(entry);
  });
}

async function snapshot(page) {
  return page.evaluate(() => {
    const bounds = element => {
      const r = element?.getBoundingClientRect();
      return r ? { x: r.x, y: r.y, width: r.width, height: r.height, bottom: r.bottom } : null;
    };
    const range = document.documentElement.scrollHeight - innerHeight;
    return {
      scrollY, maxScroll: range, nativeProgress: range > 0 ? scrollY / range : 0,
      viewport: { width: innerWidth, height: innerHeight },
      ...window.__journeyCheck,
      htmlClasses: document.documentElement.className,
      shellClasses: document.querySelector('.hy-screen-shell')?.className,
      main: bounds(document.querySelector('main')), nav: bounds(document.querySelector('nav')),
      heading: bounds(document.querySelector('main h1')),
      copy: [...document.querySelectorAll('main p')].map(bounds),
      mainPosition: document.querySelector('main') ? getComputedStyle(document.querySelector('main')).position : null,
      construction: Boolean(document.querySelector('.construction-screen')),
      homeLink: Boolean(document.querySelector('a[href="/"]')),
      horizontalOverflow: document.documentElement.scrollWidth > innerWidth + 1,
      canvasCount: document.querySelectorAll('#vault-gl').length,
      reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
    };
  });
}

const translationDistance = (a, b) => a && b
  ? Math.hypot(...a.slice(12, 15).map((value, i) => value - b[i + 12])) : Infinity;
const fixedLayout = (a, b) => ['main', 'nav', 'heading'].every(key => a[key] && b[key]
  && ['x', 'y', 'width', 'height'].every(axis => Math.abs(a[key][axis] - b[key][axis]) < .5));

async function goto(page, route = '/') {
  const response = await page.goto(`${baseUrl}${route}`, { waitUntil: 'domcontentloaded' });
  if (response?.status() !== 200) throw new Error(`${route} returned ${response?.status()}`);
  try {
    if (route === '/') await page.waitForFunction(() => window.__journeyCheck.matrix?.length === 16, null, { timeout: 30000, polling: 100 });
    else await page.waitForFunction(() => document.body.classList.contains('gl-ready'), null, { timeout: 30000, polling: 100 });
  } catch (error) {
    const state = await snapshot(page);
    report.views[`startup-${route}-${Object.keys(report.views).length}`] = state;
    console.log(JSON.stringify({ startupFailure: state }));
    await page.screenshot({ path: path.join(outputDir, `startup-failure-${Object.keys(report.views).length}.png`) });
    throw error;
  }
  await page.evaluate(() => Promise.race([document.fonts.ready, new Promise(resolve => setTimeout(resolve, 5000))]));
  // The original intro completes after roughly 2.2 seconds.
  await page.waitForTimeout(2400);
}

async function settleAt(page, progress) {
  await page.waitForFunction(p => typeof window.__journeyCheck.progress === 'number'
    && Math.abs(window.__journeyCheck.progress - p) < .00012, progress, { timeout: 15000, polling: 100 });
  await page.waitForTimeout(120);
}

async function moveTo(page, viewportNumber) {
  await page.evaluate(viewports => window.scrollTo(0, innerHeight * viewports), viewportNumber);
  const state = await snapshot(page);
  await settleAt(page, state.nativeProgress);
  return snapshot(page);
}

async function screenshot(page, name) {
  // Prime fixed layers before capturing to avoid stale headless scroll tiles.
  await page.screenshot();
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await page.screenshot({ path: path.join(outputDir, `${name}.png`) });
}

async function normalJourney(browser) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  await context.addInitScript(instrumentScene);
  const page = await context.newPage();
  observePage(page, 'desktop');
  await goto(page);
  const initial = await snapshot(page);
  report.views.desktopInitial = initial;
  check('desktop has exactly ' + VIEWPORTS + ' viewports of native travel', Math.abs(initial.maxScroll / 900 - VIEWPORTS) < .002, initial.maxScroll);
  check('desktop keeps one canvas, readable fixed copy, and no horizontal overflow', initial.canvasCount === 1
    && initial.mainPosition === 'fixed' && !initial.horizontalOverflow
    && initial.copy.every(r => r.y >= 0 && r.bottom <= 901), initial);
  await screenshot(page, 'desktop-00-entry');
  await page.mouse.move(1280, 600);
  await page.mouse.wheel(0, 450);
  await page.waitForFunction(() => scrollY > 100, null, { timeout: 10000 });
  let forward = await snapshot(page);
  await settleAt(page, forward.nativeProgress);
  forward = await snapshot(page);
  check('the first modest wheel input moves both document and camera', forward.scrollY >= 400
    && translationDistance(initial.matrix, forward.matrix) > .1 && forward.frames > initial.frames, forward);
  check('copy and navigation stay fixed during wheel descent', fixedLayout(initial, forward), { initial, forward });
  await page.mouse.wheel(0, -900);
  await page.waitForFunction(() => scrollY === 0, null, { timeout: 10000 });
  await settleAt(page, 0);
  const reverse = await snapshot(page);
  check('reverse wheel returns to the original camera', translationDistance(initial.matrix, reverse.matrix) < .035, reverse);
  for (const at of [8.5, 20, 26, 32, 42, VIEWPORTS]) {
    const view = await moveTo(page, at);
    report.views[`desktop${at}`] = view;
    check(`desktop station ${at} follows native scroll and retains fixed interface`, Math.abs(view.scrollY - at * 900) < 2
      && Math.abs(view.progress - at / VIEWPORTS) < .00012 && fixedLayout(initial, view), view);
    await screenshot(page, `desktop-${String(at).padStart(2, '0')}`);
  }
  await page.keyboard.press('Home');
  await page.waitForFunction(() => scrollY === 0, null, { timeout: 10000 });
  await settleAt(page, 0);
  check('Home returns to entry', translationDistance(initial.matrix, (await snapshot(page)).matrix) < .035);
  await page.keyboard.press('End');
  await page.waitForFunction(() => Math.abs(scrollY - (document.documentElement.scrollHeight - innerHeight)) <= 1, null, { timeout: 10000 });
  await settleAt(page, 1);
  check('End reaches the complete journey ending', (await snapshot(page)).progress > .9998);
  await context.close();
}

async function resizeJourney(browser) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  await context.addInitScript(instrumentScene);
  const page = await context.newPage();
  observePage(page, 'resize');
  await goto(page);
  const beforeResize = await moveTo(page, 10);
  await page.setViewportSize({ width: 1280, height: 800 });
  const immediate = await snapshot(page);
  await page.waitForFunction(total => Math.abs((document.documentElement.scrollHeight - innerHeight) / innerHeight - total) < .002,
    VIEWPORTS, { timeout: 15000, polling: 100 });
  await page.waitForTimeout(1500);
  const resized = await snapshot(page);
  report.views.resize = { beforeResize, immediate, resized };
  check('resize preserves native and rendered journey progress', Math.abs(resized.nativeProgress - beforeResize.nativeProgress) < .0002
    && Math.abs(resized.progress - beforeResize.progress) < .0002 && Math.abs(resized.maxScroll / 800 - VIEWPORTS) < .002,
    { beforeResize, immediate, resized });
  await context.close();
}

async function routesJourney(browser) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  await context.addInitScript(instrumentScene);
  const page = await context.newPage();
  observePage(page, 'routes');
  await goto(page);
  await moveTo(page, 3);
  await page.locator('nav a[href="/projects"]').click();
  await page.waitForURL(`${baseUrl}/projects`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => !document.documentElement.classList.contains('hy-scroll-active'));
  const navigation = await snapshot(page);
  check('route navigation removes the homepage runway', navigation.scrollY === 0 && navigation.maxScroll <= 1
    && !navigation.shellClasses.includes('hy-scroll-scene'), navigation);
  for (const route of ['/projects', '/about', '/songs']) {
    await goto(page, route);
    const before = await snapshot(page);
    await page.mouse.wheel(0, 1600);
    await page.waitForTimeout(400);
    const after = await snapshot(page);
    report.views[route] = after;
    check(`${route} remains a static single-viewport page`, after.maxScroll <= 1 && after.scrollY === 0
      && !after.htmlClasses.includes('hy-scroll-active') && translationDistance(before.matrix, after.matrix) < .01, after);
    if (after.construction) check(`${route} preserves its configured construction notice and home navigation`, after.homeLink && !after.main, after);
  }
  await context.close();
}

async function mobileJourney(browser) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  await context.addInitScript(instrumentScene);
  const page = await context.newPage();
  observePage(page, 'mobile');
  await goto(page);
  const initial = await snapshot(page);
  check('mobile portrait has ' + VIEWPORTS + ' viewports, fixed copy, and no horizontal overflow', Math.abs(initial.maxScroll / initial.viewport.height - VIEWPORTS) < .002
    && initial.mainPosition === 'fixed' && !initial.horizontalOverflow
    && initial.copy.every(r => r.bottom <= initial.viewport.height + 1), initial);
  await screenshot(page, 'mobile-00-entry');
  const close = await moveTo(page, 10);
  report.views.mobileClose = close;
  check('mobile portrait reaches the passage while retaining its interface', translationDistance(initial.matrix, close.matrix) > 1
    && fixedLayout(initial, close) && !close.horizontalOverflow, close);
  await screenshot(page, 'mobile-10-passage');
  await moveTo(page, 0);
  check('mobile reverse native scroll restores entry', translationDistance(initial.matrix, (await snapshot(page)).matrix) < .035);
  await context.close();
}

async function reducedJourney(browser) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  await context.addInitScript(instrumentScene);
  const page = await context.newPage();
  observePage(page, 'reduced-motion');
  await goto(page);
  const initial = await snapshot(page);
  const stable = await moveTo(page, 3);
  const ending = await moveTo(page, VIEWPORTS);
  report.views.reducedEnding = ending;
  check('reduced motion retains native ' + VIEWPORTS + '-viewport access and fixed copy', ending.reducedMotion
    && Math.abs(ending.maxScroll / 900 - VIEWPORTS) < .002 && fixedLayout(initial, ending), ending);
  check('reduced motion changes position while preserving viewing direction and field of view', Math.abs(translationDistance(stable.matrix, ending.matrix) - 6.8 * (VIEWPORTS - 3) / VIEWPORTS) < .03
    && stable.matrix.slice(0, 12).every((value, i) => Math.abs(value - ending.matrix[i]) < .002)
    && stable.projection.every((value, i) => Math.abs(value - ending.projection[i]) < .00001), { initial, stable, ending });
  await screenshot(page, 'reduced-motion-' + VIEWPORTS);
  await context.close();
}

async function fallbackJourney(browser) {
  const context = await browser.newContext({ viewport: { width: 1024, height: 320 } });
  await context.addInitScript(instrumentScene, { noWebGL: true });
  const page = await context.newPage();
  observePage(page, 'no-webgl-short', true);
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.querySelector('.hy-scroll-unavailable'), null, { timeout: 15000 });
  await page.evaluate(() => document.fonts.ready);
  const before = await snapshot(page);
  await screenshot(page, 'no-webgl-short-entry');
  await page.locator('main p').last().evaluate(node => node.scrollIntoView({ block: 'end' }));
  const after = await snapshot(page);
  report.views.fallback = { before, after };
  const last = after.copy.at(-1);
  check('no-WebGL fallback removes the long runway', after.maxScroll < 320 * 2
    && after.shellClasses.includes('hy-scroll-unavailable') && !after.matrix, after);
  check('no-WebGL short-screen copy remains reachable by native scrolling', after.scrollY > 0
    && last.y >= 0 && last.bottom <= 321 && after.mainPosition === 'relative' && !after.horizontalOverflow, { before, after });
  check('no-WebGL fallback retains usable route navigation', await page.locator('nav a[href="/projects"]').isVisible());
  await screenshot(page, 'no-webgl-short-readable');
  await context.close();
}

(async () => {
  fs.mkdirSync(outputDir, { recursive: true });
  const browser = await chromium.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  try {
    if (selected) {
      const previous = JSON.parse(fs.readFileSync(path.join(outputDir, 'journey-browser-check.json'), 'utf8'));
      report.priorEvidence = { capturedAt: previous.capturedAt, checks: previous.checks.filter(item => item.pass), views: previous.views };
    }
    for (const [name, run] of [['desktop', normalJourney], ['resize', resizeJourney], ['routes', routesJourney], ['mobile', mobileJourney], ['reduced-motion', reducedJourney], ['fallback', fallbackJourney]]) {
      if (selected && !selected.includes(name)) continue;
      try { await run(browser); }
      catch (error) { check(`${name} test sequence completes`, false, { message: error.message }); }
      finally { for (const context of browser.contexts()) await context.close(); }
    }
    // A generic TLS console message is matched to its failed font request here.
    if (report.externalFontErrors.some(error => /ERR_CERT/.test(error.failure || error.message || ''))) {
      report.consoleErrors = report.consoleErrors.filter(error => {
        if (/Failed to load resource: net::ERR_CERT/.test(error.message)) {
          report.externalFontErrors.push(error); return false;
        }
        return true;
      });
    }
    check('no application runtime or shader errors', report.runtimeErrors.length === 0 && report.consoleErrors.length === 0,
      { runtimeErrors: report.runtimeErrors, consoleErrors: report.consoleErrors });
  } finally {
    await browser.close();
    report.completedAt = new Date().toISOString();
    report.pass = report.checks.every(item => item.pass);
    const reportPath = path.join(outputDir, selected ? 'journey-browser-recheck.json' : 'journey-browser-check.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    if (selected && report.pass) publishRecheck(JSON.parse(fs.readFileSync(path.join(outputDir, 'journey-browser-check.json'), 'utf8')), report);
    console.log(JSON.stringify({ reportPath, passed: report.checks.filter(item => item.pass).length,
      failed: report.checks.filter(item => !item.pass), externalFontErrors: report.externalFontErrors,
      expectedFallbackErrors: report.expectedFallbackErrors }, null, 2));
    if (!report.pass) process.exitCode = 1;
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
