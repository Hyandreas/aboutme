/* eslint-disable */
// @ts-nocheck
// ============================================================
// HYACINTH — one procedural WebGL scene you move through.
// No textures, no images: the north star is a hyacinth built
// from geometry and shaders — a dark sculptural stem and leaves
// carrying a spiral raceme of florets made of light, ringed by
// instrument dials. One smoothed scroll value (0..1) drives the
// camera spiral, the bloom amount, the light colour/intensity/
// direction, fog, and dial brightness.
// Click anywhere = a calm bloom wave travels up the raceme.
// ------------------------------------------------------------
// Ported verbatim from the design bundle (spatial/hyacinth3d.js).
// Only change: three/addons/* import specifiers rewritten to
// three/examples/jsm/* so they resolve under the Next.js bundler.
// ============================================================
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const PALETTE = {
  void: 0x050309,
  obsidian: 0x0c0a18,
  indigo: 0x4f46e5,
  amethyst: 0x7c3aed,
  gold: 0xc9b78a,    // pale instrument gold at the end of the descent
  bone: 0xe8e4d8,
  leaf: 0x1a2134,    // desaturated indigo-green for stem/leaves
};
const DEG = Math.PI / 180;
const isMobile = matchMedia('(max-width: 768px)').matches;
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

const smooth = (t) => t * t * (3 - 2 * t);
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const lerp = (a, b, t) => a + (b - a) * t;
function pulse(p, c, w) { const d = Math.abs(p - c) / w; return d >= 1 ? 0 : smooth(1 - d); }

// ---------- soft radial sprite ----------
const _spriteCache = new Map();
function makeSprite(stops) {
  const key = JSON.stringify(stops);
  if (_spriteCache.has(key)) return _spriteCache.get(key);
  const s = 64, c = document.createElement('canvas');
  c.width = c.height = s;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  for (const [o, col] of stops) g.addColorStop(o, col);
  ctx.fillStyle = g; ctx.fillRect(0, 0, s, s);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  _spriteCache.set(key, tex);
  return tex;
}
const dotSprite = () => makeSprite([[0, 'rgba(232,228,216,1)'], [0.4, 'rgba(232,228,216,0.35)'], [1, 'rgba(232,228,216,0)']]);

// ============================================================
// CAMERA PATH — a full multi-revolution orbit around the specimen.
// The photo-relief cloud reads as a coherent flower from ALL sides
// (verified empirically), so the camera makes TURNS full revolutions
// across the scroll instead of a partial sweep.
// ============================================================
// Azimuth is continuous + LINEAR in scroll progress (computed in step(), not
// keyframed) so the spin is smooth and never pulses/stalls at a waypoint.
// el / r / ly / lx are still gently keyframed: a subtle dolly-in through the
// middle, and lx holds the bloom OFF-CENTRE to the right so the left text
// column stays clear of it the whole way down.
const TURNS = 2.0;        // full revolutions of the camera across the whole scroll
const AZ_START = -24;     // azimuth (deg) at the hero, before the orbit begins
const CAM_KEYS = [
  { p: 0.00, el: 4.0, r: 10.8, ly: 1.85, lx: -1.55},  // hero — wide
  { p: 0.25, el: 2.4, r: 10.0, ly: 1.95, lx: -1.55},
  { p: 0.50, el: 1.4, r: 9.6,  ly: 2.0,  lx: -1.55},  // mid — closest / most prominent
  { p: 0.75, el: 2.4, r: 10.0, ly: 1.95, lx: -1.55},
  { p: 1.00, el: 4.0, r: 10.8, ly: 1.85, lx: -1.55},  // end — pulls back wide
];
function sampleCam(p) {
  let i = 0;
  while (i < CAM_KEYS.length - 1 && p > CAM_KEYS[i + 1].p) i++;
  const a = CAM_KEYS[i], b = CAM_KEYS[Math.min(i + 1, CAM_KEYS.length - 1)];
  const span = (b.p - a.p) || 1;
  const t = smooth(clamp01((p - a.p) / span));
  return { el: lerp(a.el, b.el, t), r: lerp(a.r, b.r, t), ly: lerp(a.ly, b.ly, t), lx: lerp(a.lx, b.lx, t) };
}

// ============================================================
// main
// ============================================================
export function initHyacinth(opts = {}) {
  const canvas = opts.canvas || document.getElementById('vault-gl');
  const getProgress = opts.getProgress || (() => 0);
  if (!canvas) return null;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: !isMobile, powerPreference: 'high-performance', stencil: false, depth: true, preserveDrawingBuffer: true });
  } catch (e) { return null; }
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.25));
  renderer.setSize(Math.max(innerWidth, 1), Math.max(innerHeight, 1));
  renderer.setClearColor(PALETTE.void, 1);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(PALETTE.void, 0.042);

  const camera = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, 0.1, 300);
  const lookTarget = new THREE.Vector3(0, 0.7, 0);

  // ---------- lights ----------
  const ambient = new THREE.AmbientLight(PALETTE.bone, 0.85);
  scene.add(ambient);
  const key = new THREE.PointLight(PALETTE.indigo, 90, 0, 1.6);
  key.position.set(-5, 4, 5);
  scene.add(key);
  const fill = new THREE.PointLight(PALETTE.amethyst, 40, 0, 1.6);
  fill.position.set(5, -2, 3);
  scene.add(fill);

  const root = new THREE.Group();
  scene.add(root);

  // ---------- the specimen + instruments + atmosphere ----------
  const plant = buildPhotoCloud(root);
  const dials = buildInstruments(root);
  const dustNear = addDust(root, isMobile ? 200 : 420, 20, PALETTE.bone, 0.42);
  const dustFar = addDust(root, isMobile ? 140 : 320, 44, PALETTE.amethyst, 0.28);
  const sky = buildFluidSky(scene);

  // ---------- post: cinematic bloom (desktop only) ----------
  let composer = null, bloomPass = null;
  if (!isMobile) {
    try {
      composer = new EffectComposer(renderer);
      composer.addPass(new RenderPass(scene, camera));
      bloomPass = new UnrealBloomPass(new THREE.Vector2(innerWidth * 0.5, innerHeight * 0.5), 0.62, 0.72, 0.72);
      composer.addPass(bloomPass);
      composer.addPass(new OutputPass());
    } catch (e) { composer = null; }
  }

  // ---------- teardown bookkeeping (added for SPA route unmount) ----------
  const cleanups = [];
  let disposed = false;
  let ro = null;
  const on = (target, ev, fn, opts) => {
    target.addEventListener(ev, fn, opts);
    cleanups.push(() => target.removeEventListener(ev, fn, opts));
  };

  // ---------- resize (robust to a 0-width init in iframes) ----------
  let lastW = 0, lastH = 0;
  function applySize() {
    const w = innerWidth, h = innerHeight;
    if (w < 1 || h < 1) return;            // iframe not laid out yet — wait
    if (w === lastW && h === lastH) return;
    lastW = w; lastH = h;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.25));
    renderer.setSize(w, h);
    if (composer) composer.setSize(w, h);
  }
  let resizePending = false;
  function onResize() {
    if (resizePending) return; resizePending = true;
    requestAnimationFrame(() => { resizePending = false; applySize(); });
  }
  on(window, 'resize', onResize);
  on(window, 'load', applySize);
  // ResizeObserver catches the moment the iframe finally gets real layout, so a
  // 0-width init self-corrects instead of leaving a 0x0 canvas forever.
  if (typeof ResizeObserver !== 'undefined') {
    ro = new ResizeObserver(() => applySize());
    ro.observe(document.documentElement);
  }

  // ---------- bloom pulse (the calm click interaction) ----------
  const bloom = { phase: -1 }; // -1 idle; 0..1 wave travelling up
  let imagePlane = null, imageSweepStart = -1, imagePlaneIntro = 0;
  let imgBaseX = 0, imgBaseY = 1.0;
  let audioCtx = null;
  function chime() {
    if (reduceMotion || window.__hySound === false) return;
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      const now = audioCtx.currentTime;
      [[523.25, 0.10], [784.0, 0.06], [1046.5, 0.035]].forEach(([f, g0], i) => {
        const o = audioCtx.createOscillator(), g = audioCtx.createGain();
        o.type = 'sine'; o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, now);
        g.gain.exponentialRampToValueAtTime(g0, now + 0.18 + i * 0.05);
        g.gain.exponentialRampToValueAtTime(0.0001, now + 2.0);
        o.connect(g).connect(audioCtx.destination);
        o.start(now); o.stop(now + 2.1);
      });
    } catch (e) { /* audio optional */ }
  }
  function triggerBloom() {
    if (bloom.phase >= 0 && bloom.phase < 0.8) return;
    bloom.phase = 0;
    chime();
    if (imagePlane) imageSweepStart = clock.elapsedTime;
    document.dispatchEvent(new CustomEvent('hyacinth:bloom'));
  }

  // ============================================================
  // IMAGE MODE — (re)build the point cloud from a photo. Same path
  // used for the default hyacinth and for any image dropped into the
  // "swap render" slot. The cloud holds the photo's real colours.
  // ============================================================
  function loadImage(url) {
    plant.rebuild(url);
    if (bloomPass) { bloomPass.strength = 0.13; bloomPass.threshold = 0.86; bloomPass.radius = 0.5; }
  }

  // ---------- the one loop ----------
  const clock = new THREE.Clock();
  let smoothP = clamp01(getProgress());
  let raf = null, running = true, intro = 0;
  const hueA = new THREE.Color(PALETTE.indigo);
  const hueB = new THREE.Color(PALETTE.amethyst);
  const hueC = new THREE.Color(PALETTE.gold);
  const tmpCol = new THREE.Color();

  function frame() {
    if (disposed) return;
    raf = requestAnimationFrame(frame);
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;
    intro = Math.min(1, intro + dt * 0.45);

    const targetP = clamp01(getProgress());
    smoothP += (targetP - smoothP) * 0.06;

    if (bloom.phase >= 0) {
      bloom.phase += dt / 1.9;
      if (bloom.phase > 1.35) bloom.phase = -1;
    }

    step(smoothP, t, dt);
  }

  function step(P, t, dt) {
    // bloom wave position (travels up the raceme) + soft global swell
    const wave = bloom.phase >= 0 ? bloom.phase * 1.25 - 0.12 : -10;
    const swell = bloom.phase >= 0 ? Math.sin(clamp01(bloom.phase) * Math.PI) : 0;

    // --- camera on the spiral ---
    const k = sampleCam(P);
    const azr = (AZ_START + P * TURNS * 360) * DEG;   // continuous multi-revolution orbit
    const elr = k.el * DEG;
    const r = k.r * (1 - swell * 0.06);
    // offset the look target along the camera's RIGHT vector so the plant
    // always sits opposite the text, whatever the orbit angle
    lookTarget.set(
      k.lx * Math.cos(azr),
      k.ly,
      -k.lx * Math.sin(azr)
    );
    camera.position.set(
      Math.sin(azr) * Math.cos(elr) * r,
      k.ly + Math.sin(elr) * r,
      Math.cos(azr) * Math.cos(elr) * r
    );
    camera.lookAt(lookTarget);

    // --- light: colour temperature indigo -> amethyst -> pale gold ---
    if (P < 0.55) tmpCol.copy(hueA).lerp(hueB, smooth(P / 0.55));
    else tmpCol.copy(hueB).lerp(hueC, smooth((P - 0.55) / 0.45));
    key.color.copy(tmpCol);
    const breathe = 0.88 + Math.sin(t * 0.55) * 0.12;
    key.intensity = lerp(90, 120, P) * breathe * (1 + swell * 0.8);
    fill.intensity = lerp(40, 26, P) * (1 + swell * 0.4);
    ambient.intensity = lerp(0.85, 0.65, P) + swell * 0.3;
    // light direction circles ahead of the camera so the specimen is always raked
    const lightAz = azr + 0.8;
    key.position.set(Math.sin(lightAz) * 7, lerp(4, 1, P), Math.cos(lightAz) * 7 + 1.5);
    fill.position.set(Math.sin(azr - 1.7) * 6, lerp(-1, 3, P), Math.cos(azr - 1.7) * 6);

    scene.fog.density = lerp(0.038, 0.058, P);

    // --- world updates ---
    plant.update(t, dt, P, wave, swell, tmpCol, intro);
    dials.update(t, P, swell, intro);
    dustNear.material.uniforms.uTime.value = t;
    dustFar.material.uniforms.uTime.value = t;
    sky.update(t, P);

    // image-mode plane
    if (imagePlane) {
      imagePlaneIntro = Math.min(1, imagePlaneIntro + dt * 1.1);
      imagePlane.material.uniforms.uTime.value  = t;
      imagePlane.material.uniforms.uGlow.value  = 1.0 + swell * 0.09;
      imagePlane.material.uniforms.uIntro.value = imagePlaneIntro;
      if (imageSweepStart >= 0) {
        const norm = (t - imageSweepStart) / 2.4;
        imagePlane.material.uniforms.uSweep.value = norm < 1.25 ? norm * 1.35 - 0.18 : -1.0;
        if (norm >= 1.25) imageSweepStart = -1;
      }
      imagePlane.quaternion.copy(camera.quaternion);
      const bob = Math.sin(t * 0.45) * 0.05;
      imagePlane.position.set(imgBaseX, imgBaseY + bob, 0);
    }

    if (composer) composer.render(); else renderer.render(scene, camera);
  }

  function setRunning(on) {
    if (on && !running) { running = true; clock.getDelta(); raf = requestAnimationFrame(frame); }
    else if (!on && running) { running = false; if (raf) cancelAnimationFrame(raf); raf = null; }
  }
  let hideTimer = null;
  on(document, 'visibilitychange', () => {
    clearTimeout(hideTimer);
    if (document.hidden) hideTimer = setTimeout(() => setRunning(false), 2000);
    else setRunning(true);
  });
  ['scroll', 'wheel', 'pointermove', 'touchstart', 'focus'].forEach((ev) =>
    on(window, ev, () => setRunning(true), { passive: true }));

  document.body.classList.add('gl-ready');
  frame();

  // First-paint recovery independent of rAF, ResizeObserver, 'load', AND of any
  // fixed schedule: poll every 100ms until the canvas matches the real window
  // width (the iframe can get layout arbitrarily late). Whenever width is
  // available it sizes, advances the bloom, and forces a repaint — so the scene
  // shows even if the rAF loop is throttled to zero. Stops once sized + bloomed.
  let _tries = 0;
  (function poll() {
    if (disposed) return;
    applySize();
    const sized = lastW >= 1;
    if (sized) {
      intro = 1;   // frozen-rAF fallback: fully light the centerpiece on the first
                   // sized render (the gradual ramp is frame()'s job when rAF runs)
      try { step(smoothP, clock.elapsedTime, 0.016); } catch (e) { /* not ready */ }
    }
    const cw = Math.round(canvas.getBoundingClientRect().width);
    const done = sized && cw === innerWidth;
    if (!done && _tries++ < 150) setTimeout(poll, 100);
  })();

  return {
    triggerBloom,
    loadImage,
    getSmooth: () => smoothP,
    anchors: plant.anchors,
    plant,
    debugRenderAt: (p, sw) => { intro = 1; if (sw) bloom.phase = 0.4; step(clamp01(p), clock.elapsedTime, 0.016); },
    scene, camera, renderer,
    // Full teardown for SPA route unmount: stops the loop, detaches every
    // listener, disconnects the ResizeObserver, and frees the WebGL context.
    dispose() {
      if (disposed) return;
      disposed = true;
      running = false;
      if (raf) cancelAnimationFrame(raf);
      raf = null;
      clearTimeout(hideTimer);
      cleanups.forEach((fn) => { try { fn(); } catch (e) { /* noop */ } });
      cleanups.length = 0;
      if (ro) { ro.disconnect(); ro = null; }
      try { document.body.classList.remove('gl-ready'); } catch (e) { /* noop */ }
      try { if (composer && composer.dispose) composer.dispose(); } catch (e) { /* noop */ }
      try {
        renderer.dispose();
        if (renderer.forceContextLoss) renderer.forceContextLoss();
      } catch (e) { /* noop */ }
    },
  };
}

// ============================================================
// PHOTO → 3D POINT CLOUD. The actual hyacinth photograph is
// resampled into tens of thousands of coloured particles placed
// in real depth (luminance relief + a gentle volumetric dome), so
// the IMAGE ITSELF becomes a volumetric object: it assembles out
// of the void, drifts and breathes, can be orbited, and ripples
// when the bloom wave travels up it. Pure-black background pixels
// are discarded so the flower floats free.
// ============================================================
function buildPhotoCloud(parent) {
  const group = new THREE.Group();
  group.position.y = 0.15;
  parent.add(group);
  let points = null;

  function disposeCurrent() {
    if (points) { group.remove(points); points.geometry.dispose(); points.material.dispose(); points = null; }
  }

  function buildFrom(img) {
    const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
    if (!iw || !ih) return;
    const maxDim = isMobile ? 400 : 700;            // sampling resolution (dense = photoreal)
    const sc = Math.min(1, maxDim / Math.max(iw, ih));
    const cw = Math.max(2, Math.round(iw * sc)), ch = Math.max(2, Math.round(ih * sc));
    const cv = document.createElement('canvas'); cv.width = cw; cv.height = ch;
    const cx = cv.getContext('2d', { willReadFrequently: true });
    cx.drawImage(img, 0, 0, cw, ch);
    let data;
    try { data = cx.getImageData(0, 0, cw, ch).data; } catch (e) { return; }

    const H = 7.0, W = H * (iw / ih);               // world size, aspect-correct
    const spacing = W / cw;
    // wrap the relief around a vertical cylinder so the cloud has genuine
    // volume and can be spun in place like a turntable (not a flat card)
    const ARC = 2.15, HALF = ARC / 2;
    const R0 = (W * 0.5) / Math.sin(HALF), ZOFF = R0 * Math.cos(HALF);
    group.position.z = -ZOFF;                       // put the cylinder axis on the spin origin

    // pass 1: collect non-background pixels (drop near-black)
    const idxs = [];
    for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
      const i = (y * cw + x) * 4;
      const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
      if (a < 40) continue;
      const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
      const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255, sat = (mx - mn) / 255;
      if (lum < 0.05 && sat < 0.12) continue;
      idxs.push(i, x, y);
    }
    const total = idxs.length / 3;
    if (!total) return;
    const target = isMobile ? 90000 : 300000;
    const stride = Math.max(1, Math.round(total / target));
    const N = Math.ceil(total / stride);
    const pos = new Float32Array(N * 3), col = new Float32Array(N * 3);
    const seed = new Float32Array(N), hh = new Float32Array(N);
    let n = 0;
    for (let p = 0; p < total; p += stride) {
      const i = idxs[p * 3], x = idxs[p * 3 + 1], y = idxs[p * 3 + 2];
      const r = data[i] / 255, g = data[i + 1] / 255, b = data[i + 2] / 255;
      const u = x / (cw - 1), v = y / (ch - 1);
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      const nx = (u - 0.5) * 2, ny = (v - 0.5) * 2;
      const dome = Math.sqrt(Math.max(0, 1 - nx * nx * 0.9 - ny * ny * 0.5));
      pos[n * 3] = (u - 0.5) * W;
      pos[n * 3 + 1] = (0.5 - v) * H;
      const theta = (u - 0.5) * ARC;
      const relief = (lum - 0.45) * 0.95 + dome * 0.5;   // gentle relief: keeps the image true (photoreal)
      const rr = R0 + relief;
      pos[n * 3] = Math.sin(theta) * rr;
      pos[n * 3 + 1] = (0.5 - v) * H;
      pos[n * 3 + 2] = Math.cos(theta) * rr;             // curved around the axis at the origin
      col[n * 3] = r * 0.97; col[n * 3 + 1] = g * 0.97; col[n * 3 + 2] = b * 0.97;
      seed[n] = Math.random();
      hh[n] = 1 - v;                                     // 0 at base, 1 at crown
      n++;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
    geo.setAttribute('aH', new THREE.BufferAttribute(hh, 1));
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), Math.max(W, H));

    const fov = 42 * Math.PI / 180;
    const uSize = spacing * 1.15 * (innerHeight * 0.5) / Math.tan(fov / 2) * Math.min(devicePixelRatio || 1, 1.25);
    const mat = new THREE.ShaderMaterial({
      transparent: true, depthTest: true, depthWrite: true,
      uniforms: {
        uTime: { value: 0 }, uWave: { value: -10 }, uSwell: { value: 0 },
        uIntro: { value: 0 }, uSize: { value: uSize },
      },
      vertexShader: `
        precision highp float;
        attribute vec3 aColor; attribute float aSeed, aH;
        uniform float uTime, uWave, uSwell, uIntro, uSize;
        varying vec3 vColor; varying float vGlow;
        void main(){
          vColor = aColor;
          vec3 p = position;
          float ph = aSeed * 6.2831;
          // idle drift so the cloud breathes
          p.x += sin(uTime * 0.45 + ph) * 0.035;
          p.y += cos(uTime * 0.40 + ph * 1.3) * 0.035;
          p.z += sin(uTime * 0.55 + ph * 0.7) * 0.06;
          // bloom wave: a band travels up and pushes points forward
          float wave = exp(-pow((aH - uWave) * 4.5, 2.0));
          p.z += wave * (0.7 + uSwell * 1.2);
          // assembly: scattered in the void before the intro completes
          float s = 1.0 - clamp(uIntro, 0.0, 1.0);
          vec3 scat = vec3(sin(aSeed*51.2), sin(aSeed*73.1+1.7), sin(aSeed*31.5+4.2));
          p += scat * s * 7.0;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_PointSize = clamp(uSize / max(-mv.z, 0.1) * (0.7 + aSeed * 0.7), 1.0, 44.0);
          gl_Position = projectionMatrix * mv;
          vGlow = wave;
        }`,
      fragmentShader: `
        precision highp float;
        uniform float uSwell;
        varying vec3 vColor; varying float vGlow;
        void main(){
          vec2 d = gl_PointCoord - 0.5;
          if (dot(d, d) > 0.25) discard;                 // round particle
          vec3 c = vColor + vGlow * (0.4 + uSwell * 0.8) * vec3(0.5, 0.35, 0.85);
          gl_FragColor = vec4(c, 1.0);
        }`,
    });
    disposeCurrent();
    points = new THREE.Points(geo, mat);
    points.frustumCulled = false;
    group.add(points);
  }

  function rebuild(url) {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try { buildFrom(img); } catch (e) { /* ignore */ }
      document.dispatchEvent(new CustomEvent('hyacinth:imageLoaded'));
    };
    img.src = url;
  }

  function update(t, dt, P, wave, swell, lightCol, intro) {
    // The flower stays put at the centre — the CAMERA revolves around it (see
    // CAM_KEYS azimuth). Only a whisper of idle sway here so it feels alive.
    group.rotation.y = Math.sin(t * 0.05) * 0.025;
    if (!points) return;
    const u = points.material.uniforms;
    u.uTime.value = t;
    u.uWave.value = wave;
    u.uSwell.value = swell;
    u.uIntro.value = intro;
  }

  return { group, update, rebuild, anchors: [] };
}

// ============================================================
// THE HYACINTH — stem + leaves are dark sculpture (lit by the
// scene); the florets are pure light (custom shader, additive),
// spiralling up the raceme in phyllotaxis order.
// ============================================================
function buildHyacinth(parent) {
  const group = new THREE.Group();
  group.scale.setScalar(1.12);
  parent.add(group);

  // ---------- stem ----------
  const stemCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.0, -4.4, 0.0),
    new THREE.Vector3(0.18, -3.2, 0.06),
    new THREE.Vector3(-0.12, -1.8, -0.05),
    new THREE.Vector3(0.10, -0.4, 0.08),
    new THREE.Vector3(-0.05, 1.0, -0.06),
    new THREE.Vector3(0.0, 1.9, 0.0),
  ]);
  const stemMat = new THREE.MeshStandardMaterial({ color: 0x3a4a40, roughness: 0.62, metalness: 0.12, emissive: 0x0a1410, emissiveIntensity: 1 });
  // Only the LOWER stalk is drawn — above the skirt the florets themselves
  // form the spike, so no bare rachis pokes through the crown.
  const stemPts = stemCurve.getSpacedPoints(90);
  const visibleStem = new THREE.CatmullRomCurve3(stemPts.slice(0, 54));
  const stem = new THREE.Mesh(new THREE.TubeGeometry(visibleStem, 60, 0.058, 8), stemMat);
  group.add(stem);

  // ---------- leaves: long tapering blades arcing from the base ----------
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x2f5238, roughness: 0.62, metalness: 0.06, emissive: 0x0a1a10, emissiveIntensity: 1, side: THREE.DoubleSide });
  const leafCount = 6;
  for (let i = 0; i < leafCount; i++) {
    const phi = (i / leafCount) * Math.PI * 2 + 0.4;
    const len = 3.0 + (i % 3) * 0.42;
    const lean = 0.32 + (i % 2) * 0.16;        // how far the blade arcs outward
    const geo = buildLeafGeometry(len, 0.36 - (i % 3) * 0.045, lean);
    const leaf = new THREE.Mesh(geo, leafMat);
    leaf.position.set(Math.cos(phi) * 0.12, -4.35, Math.sin(phi) * 0.12);
    leaf.rotation.y = -phi;
    leaf.rotation.z = 0.05 + (i % 3) * 0.04;
    group.add(leaf);
  }

  // ---------- florets: SOLID recurved 6-petal stars up the raceme ----------
  // Real lit geometry (baked at full bloom, true normals) — a hyacinth you
  // could have modelled in Blender, not a cloud of light.
  const FLORETS = isMobile ? 46 : 66;
  const floretGeo = buildSolidFloretGeometry();
  const floretMat = makeFloretMaterial(false);
  const florets = new THREE.InstancedMesh(floretGeo, floretMat, FLORETS);
  florets.frustumCulled = false;

  const iH = new Float32Array(FLORETS);
  const iSeed = new Float32Array(FLORETS);
  const iTint = new Float32Array(FLORETS * 3);
  const dummy = new THREE.Object3D();
  const zAxis = new THREE.Vector3(0, 0, 1);
  const pedicelPts = [];
  const GOLDEN = 2.39996;
  const tintCol = new THREE.Color();

  for (let i = 0; i < FLORETS; i++) {
    const f = i / (FLORETS - 1);
    const tCurve = 0.46 + f * 0.44;             // raceme region of the stem
    const base = stemCurve.getPointAt(Math.min(tCurve, 0.99));
    const phi = i * GOLDEN;
    // nod slightly out/down at the skirt, tilt progressively upward at the crown
    const droop = lerp(0.0, 0.46, smooth(f));
    const out = new THREE.Vector3(Math.cos(phi), droop - 0.12, Math.sin(phi)).normalize();
    const reach = lerp(0.54, 0.18, smooth(f));  // wide skirt at the base, narrowing up
    const pos = base.clone().addScaledVector(out, reach);
    dummy.position.copy(pos);
    dummy.quaternion.setFromUnitVectors(zAxis, out);
    dummy.rotateZ(phi);                         // spin so petals don't all align
    const s = lerp(1.06, 0.5, smooth(f));       // big open flowers below, smaller up top
    dummy.scale.setScalar(s);
    dummy.updateMatrix();
    florets.setMatrixAt(i, dummy.matrix);
    iH[i] = f;
    iSeed[i] = (i * 0.6180339887) % 1;
    // per-floret hue jitter: mostly blue-violet, a few lean magenta
    const m = 0.5 + 0.5 * Math.sin(i * 2.3 + 1.0);
    tintCol.setRGB(lerp(0.84, 1.12, m), lerp(0.94, 0.82, m), lerp(1.14, 1.0, m));
    iTint[i * 3] = tintCol.r; iTint[i * 3 + 1] = tintCol.g; iTint[i * 3 + 2] = tintCol.b;
    pedicelPts.push(base.x, base.y, base.z, pos.x, pos.y, pos.z);
  }
  floretGeo.setAttribute('iH', new THREE.InstancedBufferAttribute(iH, 1));
  floretGeo.setAttribute('iSeed', new THREE.InstancedBufferAttribute(iSeed, 1));
  floretGeo.setAttribute('iTint', new THREE.InstancedBufferAttribute(iTint, 3));
  group.add(florets);

  // ---------- buds: tight closed teardrops crowning the spire ----------
  const BUDS = isMobile ? 12 : 18;
  const budGeo = buildBudGeometry();
  const budMat = makeFloretMaterial(true);
  const buds = new THREE.InstancedMesh(budGeo, budMat, BUDS);
  buds.frustumCulled = false;
  const bH = new Float32Array(BUDS);
  const bSeed = new Float32Array(BUDS);
  const bTint = new Float32Array(BUDS * 3);
  for (let i = 0; i < BUDS; i++) {
    const f = i / (BUDS - 1);
    const tCurve = 0.84 + f * 0.16;
    const base = stemCurve.getPointAt(Math.min(tCurve, 1.0));
    const phi = (FLORETS + i) * GOLDEN;
    const droop = lerp(0.38, 1.05, smooth(f));   // buds tilt steadily upright to cap the spire
    const out = new THREE.Vector3(Math.cos(phi), droop, Math.sin(phi)).normalize();
    const reach = lerp(0.2, 0.0, smooth(f));
    const pos = base.clone().addScaledVector(out, reach);
    dummy.position.copy(pos);
    dummy.quaternion.setFromUnitVectors(zAxis, out);
    dummy.rotateZ(phi);
    dummy.scale.setScalar(lerp(0.54, 0.34, smooth(f)));
    dummy.updateMatrix();
    buds.setMatrixAt(i, dummy.matrix);
    bH[i] = 0.86 + f * 0.14;
    bSeed[i] = (i * 0.618) % 1;
    bTint[i * 3] = 0.9; bTint[i * 3 + 1] = 0.9; bTint[i * 3 + 2] = 1.08;
  }
  budGeo.setAttribute('iH', new THREE.InstancedBufferAttribute(bH, 1));
  budGeo.setAttribute('iSeed', new THREE.InstancedBufferAttribute(bSeed, 1));
  budGeo.setAttribute('iTint', new THREE.InstancedBufferAttribute(bTint, 3));
  group.add(buds);

  // pedicels — short stalks from stem to each floret
  const pedGeo = new THREE.BufferGeometry();
  pedGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pedicelPts), 3));
  const pedicels = new THREE.LineSegments(pedGeo, new THREE.LineBasicMaterial({ color: 0x405038, transparent: true, opacity: 0.5 }));
  group.add(pedicels);

  // ---------- facet anchors: six florets up the spire carry the content ----------
  // Each is a real point in the world the DOM labels tether to. Placed on a
  // gentle front-facing helix so they stay readable as the camera ascends.
  const FACETS = [
    { key: 'physics',   label: 'Applied Physics',      sub: 'how things actually move' },
    { key: 'robotics',  label: 'Robotics & Aerospace', sub: 'machines that leave the ground' },
    { key: 'cs',        label: 'Computer Science',      sub: 'the systems underneath' },
    { key: 'animation', label: '3D Animation',          sub: 'making it move' },
    { key: 'violin',    label: 'Violin',                sub: 'fifteen years of it' },
    { key: 'rowing',    label: 'Rowing',                sub: 'early on the water' },
  ];
  const anchors = [];
  FACETS.forEach((fct, i) => {
    const f = i / (FACETS.length - 1);
    const tCurve = 0.55 + f * 0.42;
    const base = stemCurve.getPointAt(tCurve);
    const side = (i % 2 === 0) ? 1 : -1;
    const phi = side * (0.55 + f * 0.5);
    const out = new THREE.Vector3(Math.sin(phi) * 0.95, 0.08, Math.cos(phi) * 0.45 + 0.5).normalize();
    const pos = base.clone().addScaledVector(out, 0.6);
    const obj = new THREE.Object3D();
    obj.position.copy(pos);
    group.add(obj);
    const ring = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotSprite(), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0, fog: false, color: new THREE.Color(0x7c3aed) }));
    ring.scale.setScalar(0.95); obj.add(ring);
    const marker = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotSprite(), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0, fog: false, color: new THREE.Color(0xece6ff) }));
    marker.scale.setScalar(0.34); obj.add(marker);
    anchors.push({ ...fct, f, side: side === 1 ? 'right' : 'left', obj, normalLocal: out.clone(), appear: 0.4 + f * 0.06, live: 0, marker, ring });
  });

  // soft inner glow core so the raceme reads luminous against the void
  const core = new THREE.Sprite(new THREE.SpriteMaterial({
    map: makeSprite([[0, 'rgba(158,120,255,0.5)'], [0.5, 'rgba(96,70,220,0.18)'], [1, 'rgba(96,70,220,0)']]),
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.36, fog: false,
  }));
  core.scale.set(2.6, 3.8, 1);
  core.position.set(0, 1.5, 0);
  group.add(core);

  // halo behind the raceme so the bloom reads against the void
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({
    map: makeSprite([[0, 'rgba(124,58,237,0.4)'], [0.5, 'rgba(79,70,229,0.16)'], [1, 'rgba(79,70,229,0)']]),
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.35, fog: false,
  }));
  halo.scale.set(6.5, 8, 1);
  halo.position.set(0, 0.8, -1.2);
  group.add(halo);

  // pollen — faint motes rising around the raceme
  const POLLEN = isMobile ? 80 : 150;
  const polPos = new Float32Array(POLLEN * 3);
  const polSeed = new Float32Array(POLLEN);
  for (let i = 0; i < POLLEN; i++) {
    const a = Math.random() * Math.PI * 2, rr = 0.4 + Math.random() * 1.6;
    polPos[i * 3] = Math.cos(a) * rr;
    polPos[i * 3 + 1] = -1 + Math.random() * 4.4;
    polPos[i * 3 + 2] = Math.sin(a) * rr;
    polSeed[i] = Math.random();
  }
  const polGeo = new THREE.BufferGeometry();
  polGeo.setAttribute('position', new THREE.BufferAttribute(polPos, 3));
  polGeo.setAttribute('aSeed', new THREE.BufferAttribute(polSeed, 1));
  const polMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 }, uLift: { value: 0.3 }, uTex: { value: dotSprite() },
      uColor: { value: new THREE.Color(0xb9aee8) },
      uSize: { value: (Math.max(innerHeight, 900) / 900) * 16 },
    },
    vertexShader: `
      uniform float uTime, uLift, uSize;
      attribute float aSeed;
      varying float vA;
      void main(){
        vec3 p = position;
        p.y = -1.0 + mod(p.y + 1.0 + uTime * (0.12 + aSeed * 0.25), 4.4);
        p.x += sin(uTime * (0.3 + aSeed) + aSeed * 6.2831) * 0.25;
        p.z += cos(uTime * (0.25 + aSeed * 0.7) + aSeed * 4.0) * 0.25;
        vA = uLift * (0.3 + 0.7 * sin(uTime * (0.5 + aSeed) + aSeed * 6.2831));
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = uSize * (0.4 + aSeed * 0.8) * (1.0 / -mv.z);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform sampler2D uTex; uniform vec3 uColor;
      varying float vA;
      void main(){ vec4 t = texture2D(uTex, gl_PointCoord); gl_FragColor = vec4(uColor, t.a * max(vA, 0.0) * 0.5); }`,
  });
  const pollen = new THREE.Points(polGeo, polMat);
  pollen.frustumCulled = false;
  group.add(pollen);

  function update(t, dt, P, wave, swell, lightCol, intro) {
    // gentle sway only — the spire keeps facing the viewer so its labelled
    // florets stay readable while the camera ascends
    group.rotation.y = Math.sin(t * 0.09) * 0.16;
    group.rotation.z = Math.sin(t * 0.4) * 0.012;

    // facet markers brighten when their label is live (set from the page)
    for (const a of anchors) {
      const k = 0.5 + 0.5 * Math.sin(t * 1.6 + a.f * 6.0);
      a.marker.material.opacity = (0.45 + k * 0.5) * a.live;
      a.ring.material.opacity = (0.18 + k * 0.28) * a.live;
    }

    // bloom driven by descent: the raceme arrives already half-lit, then the
    // florets drink in the moving scene light as the camera orbits.
    const open = (0.4 + 0.6 * smooth(clamp01(P / 0.72))) * intro;
    for (const u of [floretMat.uniforms, budMat.uniforms]) {
      u.uTime.value = t;
      u.uWave.value = wave;
      u.uSwell.value = swell;
      u.uGlow.value = intro;
      u.uLightCol.value.lerp(lightCol, 0.05);
    }
    core.material.opacity = (0.34 + open * 0.16 + swell * 0.4) * intro;
    polMat.uniforms.uTime.value = t;
    polMat.uniforms.uLift.value = (0.15 + open * 0.45 + swell * 0.8) * intro;
    halo.material.opacity = (0.32 + open * 0.2 + swell * 0.3) * intro;
    pedicels.material.opacity = 0.3 + open * 0.4;
  }

  return { group, update, anchors };
}

// floret geometry: 6 petals, each a (lenSegs x widSegs) grid carrying
// parametric attrs; the vertex shader does all the shaping.
//
// ---- SOLID FLORET ------------------------------------------------------
// A real, fully-bloomed Hyacinthus floret baked on the CPU with true vertex
// normals so it can be lit like any Blender mesh: a short perianth tube and
// six lobes that flare out then strongly REFLEX (curl back) into the signature
// recurved star. aU = base→tip along each lobe; aV = across the lobe.
function setConstAttr(geo, name, val) {
  const n = geo.attributes.position.count;
  geo.setAttribute(name, new THREE.BufferAttribute(new Float32Array(n).fill(val), 1));
}

function buildSolidFloretGeometry() {
  const PETALS = 6, LEN = 12, WID = 5;
  const tubeR = 0.05, tubeLen = 0.14, curl = 2.9, L = 0.52;
  const R = L / curl;
  const geos = [];
  for (let k = 0; k < PETALS; k++) {
    const ang = (k / PETALS) * Math.PI * 2;
    const dx = Math.cos(ang), dy = Math.sin(ang);
    const px = -dy, py = dx;                       // perpendicular (across the lobe)
    const pos = [], aU = [], aV = [], idx = [];
    for (let i = 0; i <= LEN; i++) {
      const u = i / LEN;
      const a = curl * u;
      const radial = tubeR + R * (1.0 - Math.cos(a));
      const zz = tubeLen + R * Math.sin(a);
      const w = 0.17 * Math.sin(Math.min(u * 1.22, 1.0) * Math.PI * 0.72) * (1.0 - u * 0.42) + 0.006;
      for (let j = 0; j <= WID; j++) {
        const v = (j / WID) * 2 - 1;
        const keel = (1.0 - v * v) * w * 0.42;     // cup the lobe forward along its centre
        pos.push(dx * radial + px * (v * w), dy * radial + py * (v * w), zz + keel);
        aU.push(u); aV.push(v);
      }
    }
    const row = WID + 1;
    for (let i = 0; i < LEN; i++)
      for (let j = 0; j < WID; j++) {
        const o = i * row + j;
        idx.push(o, o + row, o + 1, o + 1, o + row, o + row + 1);
      }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3));
    g.setAttribute('aU', new THREE.BufferAttribute(new Float32Array(aU), 1));
    g.setAttribute('aV', new THREE.BufferAttribute(new Float32Array(aV), 1));
    g.setIndex(idx);
    g.computeVertexNormals();
    geos.push(g);
  }
  // central perianth tube the lobes spring from
  const tube = new THREE.CylinderGeometry(tubeR * 0.9, 0.022, tubeLen + 0.03, 12, 1, true);
  tube.rotateX(Math.PI / 2);                       // align the tube along +z
  tube.translate(0, 0, (tubeLen + 0.03) / 2 - 0.015);
  tube.computeVertexNormals();
  tube.deleteAttribute('uv');
  setConstAttr(tube, 'aU', 0.0);
  setConstAttr(tube, 'aV', 0.0);
  geos.push(tube);

  const merged = BufferGeometryUtils.mergeGeometries(geos, false);
  merged.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0.35), 1.4);
  return merged;
}

// a tight closed bud: a small teardrop lathe, aU running base→tip
function buildBudGeometry() {
  const H = 0.22;
  const prof = [[0.016, 0], [0.05, 0.05], [0.078, 0.11], [0.058, 0.17], [0.0, H]];
  const pts = prof.map(([r, z]) => new THREE.Vector2(r, z));
  const g = new THREE.LatheGeometry(pts, 12);
  const p = g.attributes.position;
  const aU = new Float32Array(p.count);
  for (let i = 0; i < p.count; i++) aU[i] = p.getY(i) / H;
  g.setAttribute('aU', new THREE.BufferAttribute(aU, 1));
  setConstAttr(g, 'aV', 0.0);
  g.deleteAttribute('uv');
  g.rotateX(Math.PI / 2);                          // point the bud along +z
  g.computeVertexNormals();
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0.11), 0.4);
  return g;
}

// Lit floret material — a custom ShaderMaterial doing view-space half-Lambert
// shading + rim light + back-light translucency, so the solid petals catch the
// orbiting coloured key light. Keeps the photo's real blue→violet→lilac.
function makeFloretMaterial(isBud) {
  return new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    uniforms: {
      uTime:     { value: 0 },
      uWave:     { value: -10 },
      uSwell:    { value: 0 },
      uGlow:     { value: 1 },
      uLightDir: { value: new THREE.Vector3(-0.45, 0.78, 0.55).normalize() },
      uLightCol: { value: new THREE.Color(0x4f46e5) },
      uThroat:   { value: new THREE.Color(isBud ? 0x241a66 : 0x281763) },
      uBody:     { value: new THREE.Color(isBud ? 0x4733b0 : 0x5a37c8) },
      uTip:      { value: new THREE.Color(isBud ? 0x7d63d8 : 0xc7a4ef) },
      uRim:      { value: new THREE.Color(0xa98bff) },
    },
    vertexShader: `
      attribute float aU, aV, iH, iSeed;
      attribute vec3 iTint;
      uniform float uTime, uWave;
      varying float vU, vV, vBloom;
      varying vec3 vN, vView, vTint;
      void main(){
        vU = aU; vV = aV; vTint = iTint;
        vBloom = exp(-pow((iH - uWave) * 3.0, 2.0));
        vec4 mv = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
        vView = normalize(-mv.xyz);
        vN = normalize((modelViewMatrix * instanceMatrix * vec4(normal, 0.0)).xyz);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      precision highp float;
      uniform vec3 uLightDir, uLightCol, uThroat, uBody, uTip, uRim;
      uniform float uSwell, uGlow;
      varying float vU, vV, vBloom;
      varying vec3 vN, vView, vTint;
      void main(){
        vec3 N = normalize(vN);
        if (!gl_FrontFacing) N = -N;             // light both faces of the thin petal
        vec3 Ld = normalize(uLightDir);
        // base throat→body→tip gradient (the real petal colour)
        vec3 base = mix(uThroat, uBody, smoothstep(0.0, 0.5, vU));
        base = mix(base, uTip, smoothstep(0.55, 1.0, vU) * 0.92);
        base *= vTint;
        // a subtle scene-light tint without washing out the hue
        vec3 tint = mix(vec3(1.0), uLightCol * 1.7, 0.32);
        // half-Lambert key
        float ndl = dot(N, Ld) * 0.5 + 0.5; ndl *= ndl;
        vec3 col = base * tint * (0.34 + 0.92 * ndl);
        // thin-petal back-light translucency toward the tips
        float back = clamp(dot(N, -Ld), 0.0, 1.0);
        col += uTip * vTint * back * (0.16 + 0.5 * smoothstep(0.4, 1.0, vU));
        // rim catch
        float rim = pow(1.0 - max(dot(N, normalize(vView)), 0.0), 2.6);
        col += uRim * rim * 0.45;
        // midrib vein
        col *= 1.0 - smoothstep(0.07, 0.0, abs(vV)) * 0.26;
        // travelling bloom flush + a faint idle glow toward the tips
        col += uRim * vBloom * uSwell * 1.3;
        col += uTip * pow(vU, 3.0) * 0.12;
        gl_FragColor = vec4(col * uGlow, 1.0);
      }`,
  });
}

// leaf: tapering blade, arcing outward, built on CPU once
function buildLeafGeometry(len, width, lean) {
  const SEG = 16;
  const pos = [], idx = [];
  for (let i = 0; i <= SEG; i++) {
    const u = i / SEG;
    const bend = lean * u * u * 2.2;                  // arcs outward
    const y = len * u * (1 - 0.18 * u * u);           // rises, tip droops
    const w = width * Math.sin(Math.min(u * 1.6, 1) * Math.PI * 0.62) * (1 - u * 0.55) + 0.012;
    const cup = 0.18 * w;
    pos.push(bend, y, -w, bend + cup, y, 0, bend, y, w);
  }
  for (let i = 0; i < SEG; i++) {
    const a = i * 3;
    idx.push(a, a + 3, a + 1, a + 1, a + 3, a + 4, a + 1, a + 4, a + 2, a + 2, a + 4, a + 5);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

// ============================================================
// INSTRUMENTS — a graduated dial on the floor beneath the
// specimen and a thin precessing ring around the raceme.
// Observatory hardware, not magic circles.
// ============================================================
function buildInstruments(parent) {
  const group = new THREE.Group();
  parent.add(group);

  // floor dial: circle + radial tick marks
  const dial = new THREE.Group();
  dial.position.y = -4.42;
  group.add(dial);

  const circleMat = new THREE.LineBasicMaterial({ color: PALETTE.amethyst, transparent: true, opacity: 0.2 });
  [2.6, 3.3].forEach((R) => {
    const pts = [];
    for (let i = 0; i <= 128; i++) {
      const a = (i / 128) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(a) * R, 0, Math.sin(a) * R));
    }
    dial.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), circleMat));
  });

  const TICKS = 72;
  const tickGeo = new THREE.PlaneGeometry(0.02, 0.22);
  const tickMat = new THREE.MeshBasicMaterial({ color: PALETTE.amethyst, transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const ticks = new THREE.InstancedMesh(tickGeo, tickMat, TICKS);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < TICKS; i++) {
    const a = (i / TICKS) * Math.PI * 2;
    const major = i % 6 === 0;
    dummy.position.set(Math.cos(a) * 2.95, 0, Math.sin(a) * 2.95);
    dummy.rotation.set(-Math.PI / 2, 0, -a);
    dummy.scale.set(major ? 1.6 : 1, major ? 2 : 1, 1);
    dummy.updateMatrix();
    ticks.setMatrixAt(i, dummy.matrix);
  }
  dial.add(ticks);

  // precessing ring around the raceme
  const ringMat = new THREE.MeshBasicMaterial({ color: PALETTE.indigo, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(2.1, 0.008, 6, 128), ringMat);
  ring.position.y = 0.9;
  group.add(ring);
  const ring2 = new THREE.Mesh(new THREE.TorusGeometry(2.7, 0.005, 6, 128), ringMat.clone());
  ring2.material.opacity = 0.12;
  ring2.position.y = 0.4;
  group.add(ring2);

  function update(t, P, swell, intro) {
    ring.rotation.x = Math.PI / 2 + Math.sin(t * 0.12) * 0.35 + 0.25;
    ring.rotation.z = t * 0.05;
    ring2.rotation.x = Math.PI / 2 - Math.sin(t * 0.09) * 0.3 - 0.2;
    ring2.rotation.z = -t * 0.035;
    // instruments wake at the About beat, glow softly on bloom
    const wake = (0.45 + pulse(P, 0.38, 0.32) * 0.55 + swell * 0.3) * intro;
    tickMat.opacity = 0.22 * wake;
    circleMat.opacity = 0.18 * wake;
    ring.material.opacity = 0.2 * wake;
    ring2.material.opacity = 0.11 * wake;
    dial.rotation.y = t * 0.02;
  }

  return { update };
}

// ============================================================
// DUST — drifting motes, two depth layers.
// ============================================================
function addDust(parent, count, R, color, alpha) {
  const positions = new Float32Array(count * 3);
  const scales = new Float32Array(count);
  const speeds = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * R * 1.6;
    positions[i * 3 + 1] = (Math.random() - 0.5) * R;
    positions[i * 3 + 2] = (Math.random() - 0.5) * R - 4;
    scales[i] = 0.5 + Math.random() * 1.6;
    speeds[i] = 0.15 + Math.random() * 0.5;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('aScale', new THREE.BufferAttribute(scales, 1));
  geo.setAttribute('aSpeed', new THREE.BufferAttribute(speeds, 1));
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uTex: { value: dotSprite() },
      uColor: { value: new THREE.Color(color) },
      uAlpha: { value: alpha },
      uSize: { value: (Math.max(innerHeight, 900) / 900) * (isMobile ? 22 : 28) },
    },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `
      uniform float uTime, uSize; attribute float aScale, aSpeed; varying float vA;
      void main(){
        vec3 p = position;
        p.y += sin(uTime * aSpeed + p.x * 0.3) * 0.6;
        p.x += cos(uTime * aSpeed * 0.7 + p.y * 0.2) * 0.4;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = uSize * aScale * (1.0 / -mv.z);
        gl_Position = projectionMatrix * mv;
        vA = 0.35 + 0.4 * sin(uTime * aSpeed + aScale * 6.2831);
      }`,
    fragmentShader: `
      uniform sampler2D uTex; uniform vec3 uColor; uniform float uAlpha; varying float vA;
      void main(){ vec4 t = texture2D(uTex, gl_PointCoord); gl_FragColor = vec4(uColor, t.a * vA * uAlpha); }`,
  });
  const pts = new THREE.Points(geo, mat);
  pts.renderOrder = -4; pts.frustumCulled = false;
  parent.add(pts);
  return pts;
}

// ============================================================
// GRID — graph-paper floor receding into fog; fades subtly with
// the descent. Quiet instrument backdrop, no ceiling.
// ============================================================
function addGrid(scene) {
  const g = new THREE.GridHelper(90, 44, PALETTE.amethyst, PALETTE.amethyst);
  g.material.transparent = true; g.material.opacity = 0.1; g.material.depthWrite = false;
  g.position.y = -4.45;
  scene.add(g);
  return {
    update(t, P) { g.material.opacity = 0.07 + P * 0.08; },
  };
}

// ============================================================
// FLUID SKY — the unique background. A domain-warped fbm field
// drifting like ink in water / a Navier–Stokes smoke plume —
// a quiet nod to Andreas's fluid-simulation work. Painted onto
// an inverted sphere so it wraps the whole scene and parallaxes
// gently as the camera orbits. Cheap: one quad's worth of work
// per pixel, fog-exempt, additively blooms only at its brightest
// filaments.
// ============================================================
function buildFluidSky(scene) {
  const geo = new THREE.SphereGeometry(120, 40, 28);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, depthTest: false, fog: false,
    uniforms: {
      uTime: { value: 0 },
      uProg: { value: 0 },
      uVoid: { value: new THREE.Color(0x06040c) },
      uInk:  { value: new THREE.Color(0x3a2778) },   // violet plume
      uInk2: { value: new THREE.Color(0x122a4e) },   // cold indigo undertow
    },
    vertexShader: `
      varying vec3 vDir;
      void main(){
        vDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      precision highp float;
      varying vec3 vDir;
      uniform float uTime, uProg;
      uniform vec3 uVoid, uInk, uInk2;
      float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 34.5); return fract(p.x * p.y); }
      float noise(vec2 p){
        vec2 i = floor(p), f = fract(p);
        float a = hash(i), b = hash(i + vec2(1.0,0.0)), c = hash(i + vec2(0.0,1.0)), d = hash(i + vec2(1.0,1.0));
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(mix(a,b,u.x), mix(c,d,u.x), u.y);
      }
      float fbm(vec2 p){
        float v = 0.0, a = 0.5;
        for(int i = 0; i < 3; i++){ v += a * noise(p); p = p * 2.03 + vec2(11.3, 7.7); a *= 0.5; }
        return v;
      }
      void main(){
        // direction -> a 2D plane (longitude / latitude)
        vec2 uv = vec2(atan(vDir.z, vDir.x) * 0.9, vDir.y * 1.5) * 1.9;
        float t = uTime * 0.014;
        // two-stage domain warp = the flow
        vec2 q = vec2(fbm(uv + vec2(0.0, t)), fbm(uv + vec2(5.2, 1.3) - t));
        vec2 r = vec2(fbm(uv + 3.0 * q + vec2(1.7, 9.2) + t * 0.7),
                      fbm(uv + 3.0 * q + vec2(8.3, 2.8) - t * 0.6));
        float f = fbm(uv + 3.6 * r);
        f = smoothstep(0.1, 1.05, f);
        vec3 col = uVoid;
        col = mix(col, uInk2, smoothstep(0.0, 0.85, length(r)) * 0.55);
        col = mix(col, uInk, f * f);
        // bright filaments where the warp folds — these catch the bloom
        float fil = smoothstep(0.6, 0.98, fbm(uv * 1.5 + 6.0 * r));
        col += uInk * fil * (0.3 + 0.45 * uProg);
        // sink the poles back into the void so the plume reads as a band
        col = mix(uVoid, col, smoothstep(-1.1, 0.25, vDir.y) * smoothstep(1.25, 0.35, vDir.y));
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  mesh.renderOrder = -10;
  scene.add(mesh);
  return {
    update(t, P) { mat.uniforms.uTime.value = t; mat.uniforms.uProg.value = P; },
  };
}
