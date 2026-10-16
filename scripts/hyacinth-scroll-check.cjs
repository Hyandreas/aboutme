#!/usr/bin/env node

// Exercise the real browser scroll path and observe the rendered point-cloud
// camera without exporting a debug API from the application.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.HYACINTH_PLAYWRIGHT_PATH || 'playwright');

const baselineMode = process.argv.includes('--baseline');
const introOnly = process.argv.includes('--intro-only');
const smokeOnly = process.argv.includes('--smoke-only');
const shortBaseline = process.argv.includes('--short-baseline');
const shortOnly = process.argv.includes('--short-only') || shortBaseline;
const mobileSubpagesOnly = process.argv.includes('--mobile-subpages-only');
const baseUrl = process.env.HYACINTH_CHECK_URL || 'http://127.0.0.1:5002';
const outputDir = path.join(__dirname, '../research/hyacinth-reconstruction');
const baselinePath = path.join(outputDir, 'scroll-baseline.json');

function instrumentScene({ skipIntro = true } = {}) {
  if (skipIntro) sessionStorage.setItem('hy:introSeenSession', '1');
  window.__hySound = false;
  window.__scrollCheck = { shaders: 0, matrices: 0, matrix: null, bloomEvents: 0 };
  document.addEventListener('hyacinth:bloom', () => window.__scrollCheck.bloomEvents++);
  const sources = new WeakMap();
  const observedPrograms = new WeakSet();
  const uniformNames = new WeakMap();
  for (const type of [window.WebGLRenderingContext, window.WebGL2RenderingContext]) {
    if (!type) continue;
    const proto = type.prototype;
    const shaderSource = proto.shaderSource;
    const attachShader = proto.attachShader;
    const getUniformLocation = proto.getUniformLocation;
    const uniformMatrix4fv = proto.uniformMatrix4fv;
    proto.shaderSource = function(shader, source) {
      sources.set(shader, source);
      if (source.includes('vReferenceDepth')) window.__scrollCheck.shaders++;
      return shaderSource.call(this, shader, source);
    };
    proto.attachShader = function(program, shader) {
      if (sources.get(shader)?.includes('vReferenceDepth')) observedPrograms.add(program);
      return attachShader.call(this, program, shader);
    };
    proto.getUniformLocation = function(program, name) {
      const location = getUniformLocation.call(this, program, name);
      if (location && observedPrograms.has(program)) uniformNames.set(location, name);
      return location;
    };
    proto.uniformMatrix4fv = function(location, transpose, value, ...rest) {
      if (uniformNames.get(location) === 'modelViewMatrix') {
        window.__scrollCheck.matrix = Array.from(value).slice(0, 16);
        window.__scrollCheck.matrices++;
      }
      return uniformMatrix4fv.call(this, location, transpose, value, ...rest);
    };
  }
}

async function readPose(page) {
  return page.evaluate(() => ({
    scrollY,
    maxScroll: document.documentElement.scrollHeight - innerHeight,
    matrix: window.__scrollCheck.matrix,
    matrices: window.__scrollCheck.matrices,
    viewport: { width: innerWidth, height: innerHeight },
  }));
}

function matrixDistance(a, b) {
  return Math.sqrt(a.reduce((sum, value, i) => sum + (value - b[i]) ** 2, 0));
}

function cameraDistance(a, b) {
  return matrixDistance(a.slice(12, 15), b.slice(12, 15));
}

async function waitForCameraReturn(page, matrix) {
  await page.waitForFunction(reference => {
    const current = window.__scrollCheck.matrix;
    if (!current) return false;
    return Math.hypot(...current.slice(12, 15).map((value, i) => value - reference[i])) < 0.035;
  }, matrix.slice(12, 15), { timeout: 20000, polling: 100 });
}

async function waitForScene(page) {
  try {
    await page.waitForFunction(() => window.__scrollCheck?.matrix?.length === 16, null, { timeout: 30000, polling: 100 });
  } catch (error) {
    const state = await page.evaluate(() => ({ classes: document.documentElement.className, scene: window.__scrollCheck, canvasCount: document.querySelectorAll('canvas').length, bodyText: document.body.innerText.slice(0, 700), scripts: [...document.scripts].map(script => script.src).filter(Boolean) }));
    console.log(JSON.stringify({ sceneStartupFailure: state }, null, 2));
    throw error;
  }
  await page.evaluate(() => document.fonts.ready);
  // Let the point-cloud entrance reach opacity one while RAF keeps running.
  await page.waitForTimeout(3400);
}

async function visibleContent(page) {
  return page.evaluate(() => {
    const main = document.querySelector('main');
    const heading = [...document.querySelectorAll('h1')].map(node => node.textContent.trim());
    const nav = [...document.querySelectorAll('nav a')].map(node => ({ text: node.textContent.trim(), href: node.getAttribute('href') }));
    const rect = main?.getBoundingClientRect();
    const layout = [...document.querySelectorAll('h1, nav a')].map(node => {
      const bounds = node.getBoundingClientRect();
      return { text: node.textContent.trim(), x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height };
    });
    const copyBounds = [...document.querySelectorAll('main h1, main p')].map(node => {
      const bounds = node.getBoundingClientRect();
      return { text: node.textContent.trim(), x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height, fitsViewport: bounds.x >= -1 && bounds.y >= -1 && bounds.right <= innerWidth + 1 && bounds.bottom <= innerHeight + 1 };
    });
    return {
      title: document.title,
      heading,
      nav,
      layout,
      copyBounds,
      mainText: main?.innerText.trim() || '',
      mainRect: rect ? { x: rect.x, y: rect.y, width: rect.width, height: rect.height } : null,
      horizontalOverflow: document.documentElement.scrollWidth > innerWidth + 1,
      canvases: document.querySelectorAll('#vault-gl').length,
    };
  });
}

async function goto(page, route) {
  const response = await page.goto(`${baseUrl}${route}`, { waitUntil: 'domcontentloaded' });
  assert.equal(response.status(), 200, `${route} must load successfully`);
  await waitForScene(page);
}

async function screenshot(page, name) {
  // A priming capture avoids stale fixed-layer tiles after a headless scroll.
  await page.screenshot();
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await page.screenshot({ path: path.join(outputDir, `scroll-${name}.png`) });
}

(async () => {
  fs.mkdirSync(outputDir, { recursive: true });
  const browser = await chromium.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  await context.addInitScript(instrumentScene, { skipIntro: !introOnly });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') console.log(`Browser console error: ${message.text()}`); });
  const report = { mode: baselineMode ? 'baseline' : 'verification', baseUrl, capturedAt: new Date().toISOString(), checks: [], routes: {}, errors };
  const check = (name, condition, detail) => report.checks.push({ name, pass: Boolean(condition), detail });
  try {
    if (introOnly) {
      await page.goto(baseUrl, { waitUntil: 'commit' });
      try {
        await page.waitForFunction(() => document.documentElement.classList.contains('intro2-playing'), null, { timeout: 10000 });
      } catch (error) {
        const state = await page.evaluate(() => ({ classes: document.documentElement.className, seen: sessionStorage.getItem('hy:introSeenSession'), reduceMotion: matchMedia('(prefers-reduced-motion: reduce)').matches, intro: window.__hyIntro2 ? { willPlay: window.__hyIntro2.willPlay, done: window.__hyIntro2.done } : null }));
        console.log(JSON.stringify({ introMissing: state, errors }, null, 2));
        throw error;
      }
      const before = await page.evaluate(() => ({ scrollY, classes: document.documentElement.className, htmlOverflowY: getComputedStyle(document.documentElement).overflowY, bodyOverflowY: getComputedStyle(document.body).overflowY }));
      await page.mouse.wheel(0, 1400);
      await page.waitForTimeout(500);
      const after = await page.evaluate(() => ({ scrollY, classes: document.documentElement.className, htmlOverflowY: getComputedStyle(document.documentElement).overflowY, bodyOverflowY: getComputedStyle(document.body).overflowY }));
      const locked = after.classes.includes('intro2-playing') && before.scrollY === after.scrollY && after.scrollY === 0;
      await screenshot(page, 'intro-lock');
      await page.waitForFunction(() => !document.documentElement.classList.contains('intro2-playing'), null, { timeout: 25000 });
      await page.mouse.wheel(0, 600);
      await page.waitForTimeout(700);
      const released = await page.evaluate(() => ({ scrollY, classes: document.documentElement.className, htmlOverflowY: getComputedStyle(document.documentElement).overflowY, bodyOverflowY: getComputedStyle(document.body).overflowY }));
      const introReport = { mode: 'intro-lock', before, after, released, locked, pass: locked && released.scrollY > 100 && !released.classes.includes('intro2-playing'), errors };
      fs.writeFileSync(path.join(outputDir, 'scroll-intro-lock.json'), JSON.stringify(introReport, null, 2));
      console.log(JSON.stringify(introReport, null, 2));
      if (!introReport.pass) process.exitCode = 1;
      return;
    }
    if (smokeOnly || shortOnly) {
      report.mode = shortBaseline ? 'short-baseline' : 'final-smoke';
      const viewports = shortOnly ? [{ width: 568, height: 320 }] : [{ width: 1440, height: 900 }, { width: 568, height: 320 }];
      for (const viewport of viewports) {
        await page.setViewportSize(viewport);
        await goto(page, '/');
        const initial = await readPose(page);
        const content = await visibleContent(page);
        const label = `${viewport.width}x${viewport.height}`;
        const imagePrefix = shortBaseline ? 'short-baseline' : 'smoke';
        await screenshot(page, `${imagePrefix}-${label}-initial`);
        const lastLineBefore = await page.locator('.home-lines p').last().boundingBox();
        await page.mouse.move(viewport.width - 70, viewport.height - 70);
        const wheelDelta = viewport.height < 400 ? Math.max(200, lastLineBefore.y + lastLineBefore.height - viewport.height + 40) : 2200;
        await page.mouse.wheel(0, wheelDelta);
        await page.waitForTimeout(2200);
        const forward = await readPose(page);
        const forwardContent = await visibleContent(page);
        const lastLineAfter = await page.locator('.home-lines p').last().boundingBox();
        report.routes[label] = { initial, forward, content, lastLineBefore, lastLineAfter, wheelDelta };
        check(`${label} native wheel moves document and 3D camera`, forward.scrollY > 100 && cameraDistance(initial.matrix, forward.matrix) > 0.2, { scrollY: forward.scrollY, translationDistance: cameraDistance(initial.matrix, forward.matrix) });
        if (viewport.height >= 400) {
          check(`${label} copy and navigation stay in place`, JSON.stringify(content.layout) === JSON.stringify(forwardContent.layout), { initial: content.layout, forward: forwardContent.layout });
          check(`${label} copy fits its viewport`, content.copyBounds.every(node => node.fitsViewport), content.copyBounds);
        } else {
          check(`${label} final personal-copy line can be read after scrolling`, lastLineAfter.y >= 0 && lastLineAfter.y + lastLineAfter.height <= viewport.height + 1, { before: lastLineBefore, after: lastLineAfter });
          check(`${label} overflow copy follows native document scrolling`, lastLineAfter.y < lastLineBefore.y - 100, { before: lastLineBefore.y, after: lastLineAfter.y, scrollY: forward.scrollY });
        }
        await screenshot(page, `${imagePrefix}-${label}-forward`);
      }
      check('no browser runtime errors', errors.length === 0, errors);
      const reportPath = path.join(outputDir, shortBaseline ? 'scroll-short-baseline.json' : 'scroll-final-smoke.json');
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
      console.log(JSON.stringify({ reportPath, checks: report.checks.map(({ name, pass }) => ({ name, pass })), failures: report.checks.filter(item => !item.pass), errors }, null, 2));
      if (report.checks.some(item => !item.pass)) process.exitCode = 1;
      return;
    }
    if (mobileSubpagesOnly) {
      report.mode = 'mobile-subpages';
      await page.setViewportSize({ width: 390, height: 844 });
      for (const route of ['/projects', '/about', '/songs']) {
        await goto(page, route);
        const before = await readPose(page);
        await page.mouse.wheel(0, 1600);
        await page.waitForTimeout(700);
        const after = await readPose(page);
        const sceneMode = await page.evaluate(() => ({ homeScrollClass: document.documentElement.classList.contains('hy-scroll-active'), homeRunway: Boolean(document.querySelector('.hy-scroll-scene')) }));
        report.routes[route] = { before, after, sceneMode };
        check(`${route} preserves normal mobile page flow`, !sceneMode.homeScrollClass && !sceneMode.homeRunway, sceneMode);
        check(`${route} keeps its static 3D camera while scrolling`, cameraDistance(before.matrix, after.matrix) < 0.001, { translationDistance: cameraDistance(before.matrix, after.matrix), scrollY: after.scrollY, maxScroll: after.maxScroll });
      }
      check('no browser runtime errors', errors.length === 0, errors);
      const reportPath = path.join(outputDir, 'scroll-mobile-subpages.json');
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
      console.log(JSON.stringify({ reportPath, checks: report.checks, errors }, null, 2));
      if (report.checks.some(item => !item.pass)) process.exitCode = 1;
      return;
    }
    await goto(page, '/');
    report.routes['desktop /'] = await visibleContent(page);
    const initial = await readPose(page);
    await screenshot(page, `${baselineMode ? 'baseline-' : ''}desktop-initial`);
    await page.mouse.move(1140, 600);
    await page.mouse.wheel(0, 2200);
    await page.waitForTimeout(2300);
    const forward = await readPose(page);
    const cameraDelta = cameraDistance(initial.matrix, forward.matrix);
    report.home = { initial, forward, cameraDelta };
    check('native wheel moves document scroll', forward.scrollY > initial.scrollY + 100, { before: initial.scrollY, after: forward.scrollY });
    check('native wheel changes the rendered 3D camera', cameraDelta > 0.2, { translationDistance: cameraDelta, liveFrames: forward.matrices - initial.matrices });
    check('native motion keeps RAF running', forward.matrices > initial.matrices, { liveMatrices: forward.matrices - initial.matrices });
    await screenshot(page, `${baselineMode ? 'baseline-' : ''}desktop-forward`);
    if (baselineMode) {
      // Save the meaningful RED result before collecting the unchanged routes.
      fs.writeFileSync(baselinePath, JSON.stringify(report, null, 2));
      console.log(JSON.stringify({ baselineRed: report.checks.filter(item => !item.pass), home: report.home }, null, 2));
    }

    if (!baselineMode) {
      const forwardContent = await visibleContent(page);
      check('desktop text and navigation stay in place while scrolling', JSON.stringify(forwardContent.layout) === JSON.stringify(report.routes['desktop /'].layout), { initial: report.routes['desktop /'].layout, forward: forwardContent.layout });
      await page.mouse.wheel(0, -5000);
      await page.waitForFunction(() => scrollY === 0, null, { timeout: 10000 });
      await waitForCameraReturn(page, initial.matrix);
      const reverse = await readPose(page);
      report.home.reverse = reverse;
      check('reverse wheel restores the initial camera pose', reverse.scrollY === 0 && cameraDistance(initial.matrix, reverse.matrix) < 0.035, { translationDistance: cameraDistance(initial.matrix, reverse.matrix) });
      await screenshot(page, 'desktop-reverse');
      await page.keyboard.press('PageDown');
      await page.waitForTimeout(1700);
      const keyboardForward = await readPose(page);
      check('PageDown moves document and camera', keyboardForward.scrollY > 100 && cameraDistance(initial.matrix, keyboardForward.matrix) > 0.1, keyboardForward);
      await page.keyboard.press('Home');
      await page.waitForFunction(() => scrollY === 0, null, { timeout: 10000 });
      await waitForCameraReturn(page, initial.matrix);
      check('Home restores the native scroll position', (await readPose(page)).scrollY === 0, await readPose(page));
      await page.reload({ waitUntil: 'domcontentloaded' });
      await waitForScene(page);
      const reloaded = await readPose(page);
      report.home.reloaded = reloaded;
      check('reload at home keeps the initial camera', reloaded.scrollY === 0 && cameraDistance(initial.matrix, reloaded.matrix) < 0.001, { translationDistance: cameraDistance(initial.matrix, reloaded.matrix), scrollY: reloaded.scrollY });
      await page.mouse.wheel(0, 900);
      await page.waitForTimeout(900);
      await page.locator('nav a[href="/projects"]').click();
      await page.waitForURL(`${baseUrl}/projects`);
      await waitForScene(page);
      const projectTransition = await readPose(page);
      check('navigation cleans up the home scroll runway', projectTransition.scrollY === 0 && projectTransition.maxScroll <= 1, projectTransition);
    }

    for (const route of ['/projects', '/about', '/songs']) {
      await goto(page, route);
      report.routes[`desktop ${route}`] = await visibleContent(page);
      const before = await readPose(page);
      await page.mouse.wheel(0, 1600);
      await page.waitForTimeout(700);
      const after = await readPose(page);
      check(`${route} keeps one viewport`, after.maxScroll <= 1 && after.scrollY === 0, after);
      check(`${route} keeps the static camera`, cameraDistance(before.matrix, after.matrix) < 0.001, { translationDistance: cameraDistance(before.matrix, after.matrix) });
    }

    await page.setViewportSize({ width: 390, height: 844 });
    await goto(page, '/');
    report.routes['mobile /'] = await visibleContent(page);
    await screenshot(page, `${baselineMode ? 'baseline-' : ''}mobile-initial`);
    if (!baselineMode) {
      const mobileInitial = await readPose(page);
      await page.mouse.move(330, 520);
      await page.mouse.wheel(0, 2200);
      await page.waitForTimeout(2200);
      const mobileForward = await readPose(page);
      const mobileForwardContent = await visibleContent(page);
      report.mobile = { initial: mobileInitial, forward: mobileForward, cameraDelta: cameraDistance(mobileInitial.matrix, mobileForward.matrix) };
      check('mobile native wheel moves document and 3D camera', mobileForward.scrollY > 100 && report.mobile.cameraDelta > 0.2, report.mobile);
      check('mobile text and navigation stay in place while scrolling', JSON.stringify(mobileForwardContent.layout) === JSON.stringify(report.routes['mobile /'].layout), { initial: report.routes['mobile /'].layout, forward: mobileForwardContent.layout });
      check('mobile home keeps its personal copy within the screen', mobileForwardContent.mainRect.height <= 844 && !mobileForwardContent.horizontalOverflow, mobileForwardContent);
      await screenshot(page, 'mobile-forward');
      await page.mouse.wheel(0, -5000);
      await page.waitForFunction(() => scrollY === 0, null, { timeout: 10000 });
      await waitForCameraReturn(page, mobileInitial.matrix);
      report.mobile.reverse = await readPose(page);
      check('mobile reverse wheel restores initial camera', cameraDistance(mobileInitial.matrix, report.mobile.reverse.matrix) < 0.035, report.mobile.reverse);
      await screenshot(page, 'mobile-reverse');
      await page.locator('.still-bloom-hit').evaluate(element => element.click());
      check('existing bloom action still responds', await page.evaluate(() => window.__scrollCheck.bloomEvents === 1), { bloomEvents: await page.evaluate(() => window.__scrollCheck.bloomEvents) });
    }
    for (const route of ['/projects', '/about', '/songs']) {
      await goto(page, route);
      report.routes[`mobile ${route}`] = await visibleContent(page);
      const before = await readPose(page);
      await page.mouse.wheel(0, 1600);
      await page.waitForTimeout(700);
      const after = await readPose(page);
      const sceneMode = await page.evaluate(() => ({ homeScrollClass: document.documentElement.classList.contains('hy-scroll-active'), homeRunway: Boolean(document.querySelector('.hy-scroll-scene')) }));
      check(`mobile ${route} keeps its original page flow`, !sceneMode.homeScrollClass && !sceneMode.homeRunway, { sceneMode, before, after });
      check(`mobile ${route} keeps the static camera`, cameraDistance(before.matrix, after.matrix) < 0.001, { translationDistance: cameraDistance(before.matrix, after.matrix) });
    }

    if (!baselineMode) {
      const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
      for (const [route, content] of Object.entries(report.routes)) {
        const previous = baseline.routes[route];
        if (previous) {
          check(`${route} preserves the personal website copy`, JSON.stringify([content.title, content.heading, content.mainText]) === JSON.stringify([previous.title, previous.heading, previous.mainText]), { previous, current: content });
          check(`${route} preserves navigation`, JSON.stringify(content.nav) === JSON.stringify(previous.nav), { previous: previous.nav, current: content.nav });
          check(`${route} preserves the initial viewport layout`, JSON.stringify(content.mainRect) === JSON.stringify(previous.mainRect), { previous: previous.mainRect, current: content.mainRect });
        }
        check(`${route} avoids horizontal overflow`, !content.horizontalOverflow, content);
        check(`${route} has one point-cloud canvas`, content.canvases === 1, { canvases: content.canvases });
      }
    }
    check('no browser runtime errors', errors.length === 0, errors);
    const reportPath = baselineMode ? baselinePath : path.join(outputDir, 'scroll-diagnostics.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(JSON.stringify({ reportPath, checks: report.checks.map(({ name, pass }) => ({ name, pass })), failures: report.checks.filter(item => !item.pass), errors }, null, 2));
    if (report.checks.some(item => !item.pass)) process.exitCode = 1;
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
