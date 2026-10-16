#!/usr/bin/env node

// Observe the real page's rendered flower and spatial effects. The caller
// supplies a rebuilt preview; this script never creates an application server.
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.HYACINTH_PLAYWRIGHT_PATH
  || '/Users/alan/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');

const VIEWPORTS = 44;
const DESKTOP_VIEWPORT = { width: 1280, height: 720 };
const PEAK = 8.5;
const QUIET = 26;
const smoke = process.argv.includes('--smoke');
const noCaptures = process.argv.includes('--skip-captures') || process.argv.includes('--no-captures');
const selected = process.argv.find(value => value.startsWith('--only='))?.slice(7).split(',');
const baseUrl = process.env.HYACINTH_CHECK_URL || 'http://127.0.0.1:5003';
const outputDir = process.env.HYACINTH_CHECK_OUTPUT
  ? path.resolve(process.env.HYACINTH_CHECK_OUTPUT) : path.join(__dirname, '../research/hyacinth-living-implementation');
const report = {
  baseUrl, viewports: VIEWPORTS, mode: smoke ? 'smoke' : 'verification',
  capturedAt: new Date().toISOString(), checks: [], views: {},
  capturesSkipped: noCaptures,
  runtimeErrors: [], consoleErrors: [], fontErrors: [], requestFailures: [],
  expectedFallbackErrors: [],
};
const check = (name, pass, detail) => {
  report.checks.push({ name, pass: Boolean(pass), detail });
  console.log((pass ? 'PASS ' : 'FAIL ') + name);
  if (!pass) console.log(JSON.stringify(detail));
};

function instrumentScene({ noWebGL = false } = {}) {
  sessionStorage.setItem('hy:introSeenSession', '1');
  window.__hySound = false;
  window.__livingCheck = { matrix: null, projection: null, frames: 0, flower: {}, environment: {}, programs: 0, bloomEvents: 0 };
  document.addEventListener('hyacinth:bloom', () => window.__livingCheck.bloomEvents++);
  if (noWebGL) {
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(type, ...args) {
      if (['webgl', 'webgl2', 'experimental-webgl'].includes(type)) return null;
      return getContext.call(this, type, ...args);
    };
    return;
  }
  const sources = new WeakMap(), programs = new WeakMap(), uniforms = new WeakMap();
  const classify = source => {
    if (source.includes('vReferenceDepth')) return 'flower';
    if (source.includes('uWorldReveal') && source.includes('uWorldAt')) return 'sky';
    if (source.includes('uNearStart') && source.includes('uPresence')) return 'world';
    if (source.includes('aParams') && source.includes('uEventStrength')) {
      if (source.includes('downCurrent')) return 'current';
      if (source.includes('selectEvent(uEventPhase')) return 'ripple';
      return 'accent';
    }
    return null;
  };
  function record(location, value) {
    const found = uniforms.get(location);
    if (!found) return;
    const state = window.__livingCheck;
    const target = found.kind === 'flower' ? state.flower
      : (state.environment[found.kind] ||= {});
    target[found.name] = value;
  }
  for (const type of [window.WebGLRenderingContext, window.WebGL2RenderingContext]) {
    if (!type) continue;
    const proto = type.prototype;
    const shaderSource = proto.shaderSource, attachShader = proto.attachShader;
    const getUniformLocation = proto.getUniformLocation;
    const uniformMatrix4fv = proto.uniformMatrix4fv;
    proto.shaderSource = function(shader, source) {
      sources.set(shader, source);
      return shaderSource.call(this, shader, source);
    };
    proto.attachShader = function(program, shader) {
      const kind = classify(sources.get(shader) || '');
      if (kind && !programs.has(program)) {
        programs.set(program, kind);
        window.__livingCheck.programs++;
      }
      return attachShader.call(this, program, shader);
    };
    proto.getUniformLocation = function(program, name) {
      const location = getUniformLocation.call(this, program, name);
      const kind = programs.get(program);
      if (location && kind) uniforms.set(location, { kind, name: name.replace(/\[0\]$/, '') });
      return location;
    };
    proto.uniformMatrix4fv = function(location, transpose, value, ...rest) {
      const found = uniforms.get(location);
      if (found?.kind === 'flower') {
        if (found.name === 'modelViewMatrix') {
          window.__livingCheck.matrix = Array.from(value).slice(0, 16);
          window.__livingCheck.frames++;
          window.__livingGL = this;
        } else if (found.name === 'projectionMatrix') {
          window.__livingCheck.projection = Array.from(value).slice(0, 16);
        }
      }
      return uniformMatrix4fv.call(this, location, transpose, value, ...rest);
    };
    for (const method of ['uniform1f', 'uniform1i', 'uniform2f', 'uniform3f', 'uniform4f']) {
      const original = proto[method];
      proto[method] = function(location, ...values) {
        record(location, values.length === 1 ? values[0] : values);
        return original.call(this, location, ...values);
      };
    }
    for (const method of ['uniform1fv', 'uniform2fv', 'uniform3fv', 'uniform4fv']) {
      const original = proto[method];
      proto[method] = function(location, values, ...rest) {
        const start = rest[0] || 0;
        record(location, Array.from(values).slice(start, rest[1] ? start + rest[1] : undefined));
        return original.call(this, location, values, ...rest);
      };
    }
  }
}

function observePage(page, label, fallback = false) {
  page.on('pageerror', error => report.runtimeErrors.push({ label, message: error.message }));
  page.on('console', message => {
    if (message.type() !== 'error') return;
    const entry = { label, message: message.text(), location: message.location() };
    if (/fonts\.(googleapis|gstatic)\.com/.test(entry.location.url || '')
      || /font.*ERR_CERT|ERR_CERT.*font/i.test(entry.message)) report.fontErrors.push(entry);
    else if (fallback && /WebGL context/i.test(entry.message)) report.expectedFallbackErrors.push(entry);
    else report.consoleErrors.push(entry);
  });
  page.on('requestfailed', request => {
    const entry = { label, url: request.url(), failure: request.failure()?.errorText };
    if (/fonts\.(googleapis|gstatic)\.com/.test(entry.url)) report.fontErrors.push(entry);
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
      ...window.__livingCheck,
      scrollY, range, progress: range > 0 ? scrollY / range : 0,
      viewport: { width: innerWidth, height: innerHeight },
      main: bounds(document.querySelector('main')), nav: bounds(document.querySelector('nav')),
      heading: bounds(document.querySelector('main h1')),
      copy: [...document.querySelectorAll('main p')].map(bounds),
      mainPosition: document.querySelector('main') ? getComputedStyle(document.querySelector('main')).position : null,
      htmlClasses: document.documentElement.className,
      shellClasses: document.querySelector('.hy-screen-shell')?.className,
      canvasCount: document.querySelectorAll('#vault-gl').length,
      horizontalOverflow: document.documentElement.scrollWidth > innerWidth + 1,
      reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
    };
  });
}
const maxDifference = (a, b) => Array.isArray(a) && Array.isArray(b) && a.length === b.length
  ? Math.max(0, ...a.map((value, i) => Math.abs(value - b[i]))) : Infinity;
const positionDistance = (a, b) => a && b
  ? Math.hypot(...a.slice(12, 15).map((value, i) => value - b[i + 12])) : Infinity;
const fixedLayout = (a, b) => ['main', 'nav', 'heading'].every(key => a[key] && b[key]
  && ['x', 'y', 'width', 'height'].every(axis => Math.abs(a[key][axis] - b[key][axis]) < .5));
const blooms = state => state.flower.uPetalBloom;
const peakBloom = state => Array.isArray(blooms(state)) && blooms(state)[0] > .8;
const zeroBloom = state => Array.isArray(blooms(state)) && blooms(state).every(value => Math.abs(value) < .0001);
const environmentValue = (state, name) => {
  for (const kind of ['current', 'ripple', 'accent']) {
    const value = state.environment[kind]?.[name];
    if (value !== undefined) return value;
  }
};
function majorStateMatches(a, b) {
  if (maxDifference(blooms(a), blooms(b)) > .002) return false;
  for (const name of ['uAt', 'uEnergy', 'uFlow', 'uRipple', 'uQuiet', 'uReveal', 'uReducedMotion', 'uEventPhase', 'uEventStrength']) {
    const first = environmentValue(a, name), last = environmentValue(b, name);
    if (first === undefined && last === undefined) continue;
    const delta = Array.isArray(first) ? maxDifference(first, last) : Math.abs(first - last);
    if (!Number.isFinite(delta) || delta > .005) return false;
  }
  const firstFocus = environmentValue(a, 'uFocus'), lastFocus = environmentValue(b, 'uFocus');
  if (maxDifference(firstFocus, lastFocus) >= .015) return false;
  for (const [kind, names] of [['world', ['uAt', 'uReveal', 'uPresence', 'uMotion']], ['sky', ['uWorldAt', 'uWorldReveal']]]) {
    for (const name of names) {
      const first = a.environment[kind]?.[name], last = b.environment[kind]?.[name];
      if (first === undefined && last === undefined) continue;
      if (!Number.isFinite(first) || !Number.isFinite(last) || Math.abs(first - last) > .005) return false;
    }
  }
  return true;
}
const populatedWorld = state => state.environment.world?.uReveal > .99
  && state.environment.world?.uPresence > .45
  && state.environment.sky?.uWorldReveal > .99
  && environmentValue(state, 'uEventStrength')?.filter(value => value > .35).length >= 2;

async function ready(page) {
  try {
    await page.waitForFunction(() => document.body.classList.contains('gl-ready')
      && window.__livingCheck.matrix?.length === 16
      && typeof window.__livingCheck.flower.uJourneyProgress === 'number',
    null, { timeout: 45000, polling: 100 });
  } catch (error) {
    report.views.readinessTimeout = await snapshot(page);
    console.log(JSON.stringify({ readinessTimeout: report.views.readinessTimeout }));
    throw error;
  }
  await page.evaluate(() => Promise.race([document.fonts.ready, new Promise(resolve => setTimeout(resolve, 4000))]));
}
async function resetObservation(page) {
  await page.evaluate(() => {
    const bloomEvents = window.__livingCheck.bloomEvents;
    window.__livingCheck = { matrix: null, projection: null, frames: 0, flower: {}, environment: {}, programs: 0, bloomEvents };
    window.__livingGL = null;
  });
}
async function goto(page, route = '/') {
  const response = await page.goto(baseUrl + route, { waitUntil: 'domcontentloaded' });
  if (response?.status() !== 200) throw new Error(route + ' returned ' + response?.status());
  if (route === '/') await ready(page);
  else await page.waitForFunction(() => document.body.classList.contains('gl-ready'), null, { timeout: 45000, polling: 100 });
}
async function settleAt(page, progress) {
  await page.waitForFunction(p => typeof window.__livingCheck.flower.uJourneyProgress === 'number'
    && Math.abs(window.__livingCheck.flower.uJourneyProgress - p) < .000025,
  progress, { timeout: 25000, polling: 100 });
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(resolve)));
}
async function moveTo(page, at, wheel = false) {
  const destination = await page.evaluate(viewports => innerHeight * viewports, at);
  if (wheel) {
    const before = await page.evaluate(() => scrollY);
    const viewport = page.viewportSize();
    await page.mouse.move(Math.min(1100, viewport.width - 40), Math.min(600, viewport.height - 40));
    await page.mouse.wheel(0, destination - before);
  } else await page.evaluate(y => scrollTo(0, y), destination);
  await page.waitForFunction(y => Math.abs(scrollY - Math.min(y, document.documentElement.scrollHeight - innerHeight)) < 2,
    destination, { timeout: 15000, polling: 100 });
  const state = await snapshot(page);
  await settleAt(page, state.progress);
  return snapshot(page);
}
async function screenshot(page, name) {
  if (noCaptures) return;
  await page.screenshot();
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(resolve)));
  await page.screenshot({ path: path.join(outputDir, name + '.png') });
}
async function fresh(browser, label, options, run, fallback = false) {
  const context = await browser.newContext({ viewport: DESKTOP_VIEWPORT, deviceScaleFactor: 1, ...options });
  try {
    await context.addInitScript(instrumentScene, { noWebGL: fallback });
    const page = await context.newPage();
    page.setDefaultTimeout(30000);
    observePage(page, label, fallback);
    try { return await run(page, context); }
    catch (error) {
      report.views[label + 'Failure'] = { url: page.url(), state: await snapshot(page).catch(() => null) };
      throw error;
    }
  } finally { await context.close(); }
}

async function desktop(browser) {
  await fresh(browser, 'desktop', {}, async page => {
    await goto(page);
    const initial = await moveTo(page, 0);
    report.views.entry = initial;
    check('homepage supplies exactly 44 viewports of native travel', Math.abs(initial.range / initial.viewport.height - VIEWPORTS) < .002, initial.range);
    check('entry retains one canvas, readable fixed copy and no horizontal overflow', initial.canvasCount === 1
      && initial.mainPosition === 'fixed' && !initial.horizontalOverflow
      && initial.copy.every(r => r.y >= 0 && r.bottom <= initial.viewport.height + 1), initial);
    check('entry begins with no authored petal opening', zeroBloom(initial), initial.flower);
    await screenshot(page, 'desktop-00-entry');
    const first = await moveTo(page, .5, true);
    check('a modest native wheel input moves the camera while copy stays fixed',
      first.scrollY > 100 && positionDistance(initial.matrix, first.matrix) > .08 && fixedLayout(initial, first), first);
    const early = await moveTo(page, 2, true);
    report.views.earlyWorld = early;
    check('early descent already renders overlapping auras, spatial forms and luminous background',
      populatedWorld(early) && fixedLayout(initial, early), early.environment);
    const peak = await moveTo(page, PEAK, true);
    report.views.firstOpening = peak;
    check('first opening reaches an authored physical bloom and environmental response', peakBloom(peak)
      && environmentValue(peak, 'uEnergy') > .6
      && Array.isArray(environmentValue(peak, 'uEventStrength')), { flower: peak.flower, environment: peak.environment });
    await screenshot(page, 'desktop-08.5-first-opening');
    await page.waitForTimeout(1100);
    const stopped = await snapshot(page);
    check('paused peak holds camera and authored bloom/environment state', maxDifference(peak.matrix, stopped.matrix) < .012
      && maxDifference(peak.projection, stopped.projection) < .0002
      && majorStateMatches(peak, stopped), { before: peak, after: stopped });
    const quiet = await moveTo(page, QUIET);
    report.views.underside = quiet;
    check('underside interval is quieter and focuses a different blossom',
      environmentValue(quiet, 'uEnergy') < environmentValue(peak, 'uEnergy') - .3
      && environmentValue(quiet, 'uQuiet') > environmentValue(peak, 'uQuiet') + .4
      && maxDifference(environmentValue(quiet, 'uFocus'), environmentValue(peak, 'uFocus')) > .15,
    { peak: peak.environment, quiet: quiet.environment });
    check('quiet interval keeps every surrounding layer visibly present', populatedWorld(quiet), quiet.environment);
    await screenshot(page, 'desktop-26-underside');
    const returned = await moveTo(page, PEAK, true);
    check('reverse wheel restores full peak camera, projection and authored scene state',
      maxDifference(returned.matrix, peak.matrix) < .012
      && maxDifference(returned.projection, peak.projection) < .0002
      && majorStateMatches(returned, peak), { peak, returned });
    if (!smoke) {
      for (const at of [20, 32, 42, VIEWPORTS]) {
        const view = await moveTo(page, at);
        report.views['desktop' + at] = view;
        check('station ' + at + ' retains native progress and fixed personal interface',
          Math.abs(view.flower.uJourneyProgress - at / VIEWPORTS) < .00003 && fixedLayout(initial, view), view);
        await screenshot(page, 'desktop-' + at);
      }
      await page.keyboard.press('Home');
      await page.waitForFunction(() => scrollY === 0);
      await settleAt(page, 0);
      const home = await snapshot(page);
      check('Home restores entry framing and closes authored blooms', positionDistance(initial.matrix, home.matrix) < .04
        && maxDifference(initial.projection, home.projection) < .0002 && zeroBloom(home), home);
      await page.keyboard.press('End');
      await page.waitForFunction(() => Math.abs(scrollY - (document.documentElement.scrollHeight - innerHeight)) < 2);
      await settleAt(page, 1);
      check('End reaches the complete 44-viewport release', (await snapshot(page)).flower.uJourneyProgress > .9999);
    }
  });
}

async function resize(browser) {
  await fresh(browser, 'resize', {}, async page => {
    await goto(page);
    const before = await moveTo(page, PEAK);
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.waitForFunction(total => Math.abs((document.documentElement.scrollHeight - innerHeight) / innerHeight - total) < .002,
      VIEWPORTS, { polling: 100 });
    await page.waitForFunction(p => Math.abs(scrollY / (document.documentElement.scrollHeight - innerHeight) - p) < .0002,
      before.progress, { polling: 100 });
    await settleAt(page, before.progress);
    const after = await snapshot(page);
    report.views.resize = { before, after };
    check('resize preserves normalized progress and peak petal opening', Math.abs(before.progress - after.progress) < .0002
      && maxDifference(blooms(before), blooms(after)) < .004 && Math.abs(after.range / 800 - VIEWPORTS) < .002, { before, after });
  });
}

async function routes(browser) {
  await fresh(browser, 'routes', {}, async page => {
    await goto(page);
    await moveTo(page, 32);
    await page.getByRole('link', { name: 'Projects', exact: true }).click();
    await page.waitForURL(baseUrl + '/projects', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => !document.documentElement.classList.contains('hy-scroll-active'));
    const away = await snapshot(page);
    check('route navigation removes the long homepage runway', away.range <= 1 && away.scrollY === 0
      && !away.shellClasses?.includes('hy-scroll-scene'), away);
    for (const route of ['/projects', '/about', '/songs']) {
      await goto(page, route);
      const before = await snapshot(page);
      await page.mouse.wheel(0, 1600);
      await page.waitForTimeout(250);
      const after = await snapshot(page);
      check(route + ' retains its single-viewport scene', after.range <= 1 && after.scrollY === 0
        && !after.htmlClasses.includes('hy-scroll-active') && after.canvasCount === 1, { before, after });
    }
  });
}

async function mobile(browser) {
  await fresh(browser, 'mobile', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }, async page => {
    await goto(page);
    const initial = await snapshot(page);
    const peak = await moveTo(page, PEAK);
    report.views.mobilePeak = peak;
    check('mobile retains all 44 viewport lengths without horizontal overflow', Math.abs(peak.range / 844 - VIEWPORTS) < .002
      && !peak.horizontalOverflow && fixedLayout(initial, peak), peak);
    check('mobile retains the first focal opening with a live environment', peakBloom(peak)
      && environmentValue(peak, 'uEnergy') > .6, { flower: peak.flower, environment: peak.environment });
    check('mobile keeps all three surrounding layers', populatedWorld(peak), peak.environment);
    await screenshot(page, 'mobile-08.5-first-opening');
    const returned = await moveTo(page, 0);
    check('mobile native reversal recovers entry and closed authored petals', positionDistance(initial.matrix, returned.matrix) < .04
      && zeroBloom(returned), returned);
    await page.getByRole('button', { name: 'Open navigation menu' }).click();
    await page.getByRole('link', { name: 'Projects', exact: true }).click();
    await page.waitForURL(baseUrl + '/projects', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => !document.documentElement.classList.contains('hy-scroll-active'));
    check('mobile navigation exits the long journey', !(await snapshot(page)).htmlClasses.includes('hy-scroll-active'));
  });
}

async function reduced(browser) {
  await fresh(browser, 'reduced-motion', { reducedMotion: 'reduce' }, async page => {
    await goto(page);
    const initial = await snapshot(page);
    const peak = await moveTo(page, PEAK);
    const ending = await moveTo(page, VIEWPORTS);
    report.views.reduced = { initial, peak, ending };
    check('reduced motion retains native reading/navigation while suppressing large petal movement',
      zeroBloom(peak) && zeroBloom(ending) && peak.flower.uPetalActive < .0001
      && environmentValue(peak, 'uReducedMotion') === 1
      && Math.abs(ending.range / ending.viewport.height - VIEWPORTS) < .002 && fixedLayout(initial, ending), report.views.reduced);
    check('reduced camera keeps its orientation and projection through the descent',
      maxDifference(initial.matrix.slice(0, 12), ending.matrix.slice(0, 12)) < .003
      && maxDifference(initial.projection, ending.projection) < .0002, { initial, ending });
    check('reduced motion freezes the new spatial world and background travel',
      ending.environment.world?.uMotion === 0 && ending.environment.world?.uTime === 0
      && ending.environment.sky?.uWorldAt === 0, ending.environment);
    await screenshot(page, 'reduced-motion-44');
  });
  await fresh(browser, 'runtime-preference', {}, async page => {
    await goto(page);
    const before = await moveTo(page, PEAK);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.waitForFunction(() => {
      const values = window.__livingCheck.flower.uPetalBloom;
      return Array.isArray(values) && values.every(value => Math.abs(value) < .0001);
    }, null, { timeout: 15000, polling: 100 });
    const after = await snapshot(page);
    check('changing motion preference at peak immediately removes authored bloom and foreground waves',
      peakBloom(before) && zeroBloom(after) && environmentValue(after, 'uReducedMotion') === 1
      && Math.abs(before.progress - after.progress) < .0002, { before, after });
    await page.getByRole('link', { name: 'Projects', exact: true }).click();
    await page.waitForURL(baseUrl + '/projects', { waitUntil: 'domcontentloaded' });
    await resetObservation(page);
    await page.getByRole('link', { name: 'Home', exact: true }).click();
    await page.waitForURL(baseUrl + '/', { waitUntil: 'domcontentloaded' });
    await ready(page);
    const remounted = await moveTo(page, PEAK);
    check('cached-module remount uses the current motion preference', remounted.reducedMotion
      && zeroBloom(remounted) && environmentValue(remounted, 'uReducedMotion') === 1, remounted);
  });
}

async function fallback(browser) {
  await fresh(browser, 'no-WebGL', { viewport: { width: 1024, height: 320 } }, async page => {
    await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => document.querySelector('.hy-scroll-unavailable'));
    await page.evaluate(() => Promise.race([document.fonts.ready, new Promise(resolve => setTimeout(resolve, 4000))]));
    const before = await snapshot(page);
    await page.locator('main p').last().evaluate(node => node.scrollIntoView({ block: 'end' }));
    const after = await snapshot(page);
    check('startup failure removes the long runway and preserves short-screen copy access', after.range < 640
      && after.mainPosition === 'relative' && after.copy.at(-1).bottom <= 321 && !after.horizontalOverflow
      && !after.matrix, { before, after });
    check('startup fallback retains route navigation', await page.locator('nav a[href="/projects"]').isVisible());
    await screenshot(page, 'no-WebGL-short');
  }, true);
}

async function contextRecovery(browser) {
  await fresh(browser, 'context-recovery', {}, async page => {
    await goto(page);
    const before = await moveTo(page, PEAK);
    await page.evaluate(() => {
      window.__livingLoseContext = window.__livingGL.getExtension('WEBGL_lose_context');
      if (!window.__livingLoseContext) throw new Error('The browser does not provide the context-loss test extension');
      window.__livingLoseContext.loseContext();
    });
    await page.waitForFunction(() => document.querySelector('.hy-scroll-unavailable')
      && !document.body.classList.contains('gl-ready'));
    const lost = await snapshot(page);
    check('live context loss shows fallback and collapses the native runway', lost.range < lost.viewport.height * 2, lost);
    await page.evaluate(() => window.__livingLoseContext.restoreContext());
    await page.waitForFunction(total => !document.querySelector('.hy-scroll-unavailable')
      && document.body.classList.contains('gl-ready')
      && Math.abs((document.documentElement.scrollHeight - innerHeight) / innerHeight - total) < .002,
    VIEWPORTS, { timeout: 25000, polling: 100 });
    await page.waitForFunction(frames => window.__livingCheck.frames > frames, lost.frames);
    await settleAt(page, before.progress);
    const restored = await snapshot(page);
    report.views.contextRecovery = { before, lost, restored };
    check('context restoration resumes the saved native peak and major scene state', Math.abs(before.progress - restored.progress) < .0002
      && majorStateMatches(before, restored) && maxDifference(before.projection, restored.projection) < .0002,
    report.views.contextRecovery);
  });
}

async function run() {
  fs.mkdirSync(outputDir, { recursive: true });
  const browser = await chromium.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  try {
    const cases = [['desktop', desktop], ['resize', resize], ['routes', routes], ['mobile', mobile],
      ['reduced', reduced], ['fallback', fallback], ['context', contextRecovery]];
    for (const [name, exercise] of cases) {
      if (smoke && name !== 'desktop') continue;
      if (selected && !selected.includes(name)) continue;
      try { await exercise(browser); }
      catch (error) { check(name + ' sequence completes', false, { message: error.message }); }
      finally { for (const context of browser.contexts()) await context.close(); }
    }
    if (report.fontErrors.some(error => /ERR_CERT/.test(error.failure || error.message || ''))) {
      report.consoleErrors = report.consoleErrors.filter(error => {
        if (/Failed to load resource: net::ERR_CERT/.test(error.message)) { report.fontErrors.push(error); return false; }
        return true;
      });
    }
    check('no application runtime or shader errors', report.runtimeErrors.length === 0 && report.consoleErrors.length === 0,
      { runtimeErrors: report.runtimeErrors, consoleErrors: report.consoleErrors });
  } finally {
    await browser.close();
    report.completedAt = new Date().toISOString();
    report.pass = report.checks.length > 1 && report.checks.every(item => item.pass);
    const label = smoke ? 'smoke' : selected ? selected.join('-') : 'full';
    const reportPath = path.join(outputDir, 'living-browser-' + label + '.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(JSON.stringify({ reportPath, passed: report.checks.filter(item => item.pass).length,
      failed: report.checks.filter(item => !item.pass), fontErrors: report.fontErrors }, null, 2));
    if (!report.pass) process.exitCode = 1;
  }
}

if (require.main === module) run().catch(error => { console.error(error); process.exitCode = 1; });
module.exports = { instrumentScene, VIEWPORTS };
