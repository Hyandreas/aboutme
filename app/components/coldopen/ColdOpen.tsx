'use client';

/*
 * COLD OPEN — a VHS / CRT broadcast reel that plays once per browser session
 * on a fresh visit to the homepage, then signs off cleanly: a hard zoom-cut
 * into the sign-on screen, a broken-signal flicker, a turn to static, and a
 * slow buzz down to black before the site bleeds in underneath (no star-flash).
 *
 * Faithful React port of the design prototype's intro2.js. The reel is built
 * imperatively in an effect (it's a self-contained animation, not page content)
 * and torn down on unmount. It fires `hy:coldopen-done` during the blackout
 * (the screen is fully black, the page mounted underneath) so HyacinthClient
 * lifts its overture and carves the hero in lock-step before the reel fades.
 *
 * Behaviour decided by coldOpenState.coldOpenWillPlay() (session-gated,
 * reduced-motion aware). Sound is on by default with a mute toggle; autoplay
 * resumes on the first user gesture if the browser blocks it.
 */

import { useEffect } from 'react';
import { coldOpenWillPlay } from './coldOpenState';

/* eslint-disable @typescript-eslint/no-explicit-any */

function markup(): string {
  return '' +
    '<div class="crt2-screen">' +
      '<div class="crt2-pic">' +

        '<div class="crt2-frame f2-static on" data-f="static">' +
          '<span class="no-sig">\u25A0 NO SIGNAL \u00B7 CH-01</span>' +
        '</div>' +

        '<div class="crt2-frame f2-bars" data-f="bars">' +
          '<div class="bars2-main"><i class="b1"></i><i class="b2"></i><i class="b3"></i><i class="b4"></i><i class="b5"></i><i class="b6"></i><i class="b7"></i></div>' +
          '<div class="bars2-mid"><i class="m1"></i><i class="m2"></i><i class="m3"></i><i class="m4"></i><i class="m5"></i><i class="m6"></i><i class="m7"></i></div>' +
          '<div class="bars2-low"><span class="pluge"></span><span class="white"></span><span class="blk"></span></div>' +
          '<div class="bars2-corner">TV AV</div>' +
          '<div class="bars2-tc">00:00:01:14</div>' +
          '<div class="lower2"><span>ANDREAS TSANG PRESENTS</span></div>' +
        '</div>' +

        // HYACINTH spells itself out — white letters; the SCREEN flashes a new
        // colour per letter (palette in revealSpell). Hidden glyphs take no
        // space so the visible word stays centred as it grows.
        '<div class="crt2-frame f2-card f2-spell" data-f="spell">' +
          '<div class="spell2-word">' +
            '<b>H</b><b>Y</b><b>A</b><b>C</b><b>I</b><b>N</b><b>T</b><b>H</b>' +
          '</div>' +
        '</div>' +

        '<div class="crt2-frame f2-signon" data-f="signon">' +
          '<div class="signon2-word" data-word="HYACINTH">HYACINTH</div>' +
          '<div class="signon2-sub">A site by Andreas Tsang</div>' +
          '<div class="signon2-standby">\u25AE now entering</div>' +
        '</div>' +

      '</div>' +
      '<div class="crt2-grille"></div>' +
      '<div class="crt2-track"></div>' +
      '<div class="crt2-bloom"></div>' +
      '<div class="crt2-flick"></div>' +
      '<div class="crt2-scan"></div>' +
      '<div class="crt2-cut"></div>' +
    '</div>' +
    '<div class="crt2-dissolve"></div>' +
    '<div class="crt2-resolve"></div>' +
    '<div class="crt2-blackout"></div>' +
    '<canvas class="crt2-particles"></canvas>' +
    '<button class="crt2-sound on" type="button" aria-label="Toggle sound">' +
      '<span class="eq"><i></i><i></i><i></i></span><span class="lbl">Sound</span>' +
    '</button>';
}

/* ---- WebAudio broadcast sound design (generated, no asset files) ---- */
interface ColdOpenAudio {
  setMuted: (m: boolean) => void;
  resumeOnGesture: () => void;
  tryResume: () => void;
  powerOn: () => void;
  staticHiss: (dur: number, level?: number) => void;
  tone: (freq: number, dur: number) => void;
  click: () => void;
  neonHum: (dur: number) => void;
  resolveChime: () => void;
  stopAll: () => void;
}

function makeAudio(): ColdOpenAudio {
  const Ctx = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext;
  if (!Ctx) {
    const noop = () => {};
    return {
      setMuted: noop, resumeOnGesture: noop, tryResume: noop,
      powerOn: noop, staticHiss: noop, tone: noop, click: noop,
      neonHum: noop, resolveChime: noop, stopAll: noop,
    };
  }
  const ctx = new Ctx();
  const master = ctx.createGain();
  master.gain.value = 0.5;
  master.connect(ctx.destination);

  let live: Array<AudioScheduledSourceNode> = [];
  const noiseBuf = (() => {
    const b = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return b;
  })();

  const now = () => ctx.currentTime;
  const track = (node: AudioScheduledSourceNode) => {
    live.push(node);
    node.onended = () => { const i = live.indexOf(node); if (i > -1) live.splice(i, 1); };
  };

  const tryResume = () => { if (ctx.state === 'suspended') ctx.resume().catch(() => {}); };
  const resumeOnGesture = () => {
    const fn = () => tryResume();
    (['pointerdown', 'keydown', 'touchstart', 'mousemove', 'wheel'] as const).forEach((ev) =>
      window.addEventListener(ev, fn, { once: true, passive: true }),
    );
  };
  const setMuted = (m: boolean) => {
    master.gain.cancelScheduledValues(now());
    master.gain.linearRampToValueAtTime(m ? 0.0001 : 0.5, now() + 0.12);
  };

  const powerOn = () => {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(150, now());
    o.frequency.exponentialRampToValueAtTime(42, now() + 0.22);
    g.gain.setValueAtTime(0.0001, now());
    g.gain.exponentialRampToValueAtTime(0.6, now() + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, now() + 0.4);
    o.connect(g); g.connect(master); o.start(); o.stop(now() + 0.42); track(o);
    const o2 = ctx.createOscillator(), g2 = ctx.createGain();
    o2.type = 'triangle'; o2.frequency.setValueAtTime(1600, now());
    o2.frequency.exponentialRampToValueAtTime(520, now() + 0.18);
    g2.gain.setValueAtTime(0.0001, now());
    g2.gain.exponentialRampToValueAtTime(0.12, now() + 0.01);
    g2.gain.exponentialRampToValueAtTime(0.0001, now() + 0.22);
    o2.connect(g2); g2.connect(master); o2.start(); o2.stop(now() + 0.24); track(o2);
  };

  const staticHiss = (dur: number, level = 0.16) => {
    const src = ctx.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 3200; bp.Q.value = 0.6;
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 1100;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, now());
    g.gain.exponentialRampToValueAtTime(level, now() + 0.05);
    g.gain.setValueAtTime(level, now() + dur - 0.12);
    g.gain.exponentialRampToValueAtTime(0.0001, now() + dur);
    src.connect(bp); bp.connect(hp); hp.connect(g); g.connect(master);
    src.start(); src.stop(now() + dur + 0.02); track(src);
  };

  const tone = (freq: number, dur: number) => {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine'; o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, now());
    g.gain.exponentialRampToValueAtTime(0.14, now() + 0.01);
    g.gain.setValueAtTime(0.14, now() + dur - 0.04);
    g.gain.exponentialRampToValueAtTime(0.0001, now() + dur);
    o.connect(g); g.connect(master); o.start(); o.stop(now() + dur + 0.02); track(o);
  };

  const click = () => {
    const src = ctx.createBufferSource(); src.buffer = noiseBuf;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1800; bp.Q.value = 1.4;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, now());
    g.gain.exponentialRampToValueAtTime(0.4, now() + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, now() + 0.07);
    src.connect(bp); bp.connect(g); g.connect(master);
    src.start(); src.stop(now() + 0.09); track(src);
  };

  const neonHum = (dur: number) => {
    [60, 120, 119.3].forEach((f, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = i === 0 ? 'sine' : 'sawtooth'; o.frequency.value = f;
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 320;
      g.gain.setValueAtTime(0.0001, now());
      g.gain.exponentialRampToValueAtTime(i === 0 ? 0.14 : 0.05, now() + 0.25);
      g.gain.setValueAtTime(g.gain.value, now() + dur - 0.3);
      g.gain.exponentialRampToValueAtTime(0.0001, now() + dur);
      o.connect(lp); lp.connect(g); g.connect(master); o.start(); o.stop(now() + dur + 0.05); track(o);
    });
  };

  const resolveChime = () => {
    [392.0, 523.25, 659.25].forEach((f, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine'; o.frequency.value = f;
      const t0 = now() + i * 0.1;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.16, t0 + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.9);
      o.connect(g); g.connect(master); o.start(t0); o.stop(t0 + 0.95); track(o);
    });
  };

  const stopAll = () => {
    live.slice().forEach((n) => { try { n.stop(); } catch { /* noop */ } });
    live = [];
    setTimeout(() => { try { ctx.close(); } catch { /* noop */ } }, 60);
  };

  return { setMuted, resumeOnGesture, tryResume, powerOn, staticHiss, tone, click, neonHum, resolveChime, stopAll };
}

export default function ColdOpen() {
  useEffect(() => {
    if (!coldOpenWillPlay()) return;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let timers: number[] = [];
    let ended = false;
    let muted = false;
    let audio: ReturnType<typeof makeAudio> | null = null;

    const root = document.createElement('div');
    root.className = 'crt2';
    root.innerHTML = markup();
    document.body.appendChild(root);
    document.documentElement.classList.add('coldopen-playing');
    (window as any).__coldOpenDone = false;

    const cut = root.querySelector<HTMLElement>('.crt2-cut');
    const frames: Record<string, HTMLElement> = {};
    root.querySelectorAll<HTMLElement>('.crt2-frame').forEach((f) => { frames[f.dataset.f as string] = f; });

    // CRT power-on via WAAPI (plays once; not reset by re-renders)
    const scr = root.querySelector<HTMLElement>('.crt2-screen');
    if (!reduce && scr && scr.animate) {
      scr.animate(
        [
          { opacity: 0, transform: 'scaleY(0.004) scaleX(1.22)', filter: 'brightness(6)' },
          { opacity: 1, transform: 'scaleY(0.02) scaleX(1.12)', filter: 'brightness(5)', offset: 0.16 },
          { opacity: 1, transform: 'scaleY(1) scaleX(1)', filter: 'brightness(1.9)', offset: 0.46 },
          { opacity: 1, transform: 'scaleY(1) scaleX(1)', filter: 'brightness(1)' },
        ],
        { duration: 640, easing: 'cubic-bezier(0.16,1,0.3,1)', fill: 'none' },
      );
    }

    const sBtn = root.querySelector<HTMLButtonElement>('.crt2-sound');
    const sLbl = sBtn?.querySelector<HTMLElement>('.lbl');
    const onSound = (e: Event) => {
      e.stopPropagation();
      muted = !muted;
      sBtn?.classList.toggle('on', !muted);
      sBtn?.classList.toggle('muted', muted);
      if (sLbl) sLbl.textContent = muted ? 'Muted' : 'Sound';
      audio?.setMuted(muted);
    };
    sBtn?.addEventListener('click', onSound);

    audio = makeAudio();
    audio.setMuted(muted);
    audio.resumeOnGesture();
    audio.tryResume();

    const showOnly = (id: string) => {
      for (const k in frames) frames[k].classList.toggle('on', k === id);
    };
    const flashCut = () => {
      if (!cut) return;
      cut.classList.remove('flash'); void cut.offsetWidth; cut.classList.add('flash');
    };
    const clearAll = () => { timers.forEach((t) => clearTimeout(t)); timers = []; };

    // HYACINTH spells itself out one letter at a time, the gaps shrinking
    // quadratically (slow-then-fast). Each letter flashes the whole screen a
    // new colour — a deliberately NON-rainbow run (big hue jumps between
    // neighbours) for strong variety.
    const revealSpell = () => {
      const spellEl = root.querySelector<HTMLElement>('.f2-spell');
      const letters = root.querySelectorAll<HTMLElement>('.spell2-word b');
      const N = letters.length;
      const palette = ['#D23F8E', '#2E9FB0', '#6A3FD0', '#C0432F', '#3577C9', '#2C9E5E', '#B23FB0', '#C76A2A'];
      const notes = [523, 587, 659, 698, 784, 880, 988, 1047]; // rising C scale
      let at = 0;
      for (let i = 0; i < N; i++) {
        const el = letters[i];
        const color = palette[i % palette.length];
        const note = notes[i] ?? 1047;
        timers.push(window.setTimeout(() => {
          if (spellEl) {
            spellEl.style.background = color;
            spellEl.classList.remove('flash'); void spellEl.offsetWidth; spellEl.classList.add('flash');
          }
          el.classList.add('lit');
          audio?.click();
          audio?.tone(note, 0.07);
        }, at));
        if (i < N - 1) {
          const f = (N - 2 - i) / (N - 2); // 1 → 0 across the gaps
          at += 120 + 400 * f * f;         // quadratic: 520ms gap → 120ms gap
        }
      }
    };

    // ---- particle sign-off ------------------------------------------------
    // The TV snow resolves into a colour point-cloud sampled from the SAME
    // hyacinth.png the WebGL scene uses, so it reads exactly like the scene's
    // "static": it converges into the flower, holds, then disperses to nothing
    // as the whole reel fades, revealing the site assembling underneath.
    const pcanvas = root.querySelector<HTMLCanvasElement>('.crt2-particles');
    let praf = 0;
    let disposed = false;
    let particleData: {
      n: number; hx: Float32Array; hy: Float32Array; aspect: number;
      groups: Array<{ style: string; idx: Int32Array }>;
    } | null = null;

    const sampleHyacinth = (img: HTMLImageElement) => {
      const iw = img.naturalWidth, ih = img.naturalHeight;
      if (!iw || !ih) return;
      const MAX = 260; // sampling resolution (kept small; we only need ~9k pts)
      const sc = Math.min(1, MAX / Math.max(iw, ih));
      const cw = Math.max(2, Math.round(iw * sc)), ch = Math.max(2, Math.round(ih * sc));
      const oc = document.createElement('canvas'); oc.width = cw; oc.height = ch;
      const octx = oc.getContext('2d', { willReadFrequently: true });
      if (!octx) return;
      octx.drawImage(img, 0, 0, cw, ch);
      let data: Uint8ClampedArray;
      try { data = octx.getImageData(0, 0, cw, ch).data; } catch { return; }
      // collect non-background pixels (drop near-black, like the WebGL cloud)
      const picks: number[] = [];
      for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
        const i = (y * cw + x) * 4;
        const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
        if (a < 40) continue;
        const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
        const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255, sat = (mx - mn) / 255;
        if (lum < 0.06 && sat < 0.12) continue;
        picks.push(i, x, y);
      }
      const total = picks.length / 3;
      if (!total) return;
      const TARGET = 9000;
      const stride = Math.max(1, Math.round(total / TARGET));
      const xs: number[] = [], ys: number[] = [], keys: number[] = [];
      for (let p = 0; p < total; p += stride) {
        const i = picks[p * 3], x = picks[p * 3 + 1], y = picks[p * 3 + 2];
        xs.push(x); ys.push(y);
        // quantise colour to 5 bits/channel so we can batch draws by colour
        const r = data[i] >> 3, g = data[i + 1] >> 3, b = data[i + 2] >> 3;
        keys.push((r << 10) | (g << 5) | b);
      }
      const n = xs.length;
      const hx = new Float32Array(n), hy = new Float32Array(n);
      for (let k = 0; k < n; k++) { hx[k] = xs[k] / (cw - 1) - 0.5; hy[k] = ys[k] / (ch - 1) - 0.5; }
      const buckets = new Map<number, number[]>();
      for (let k = 0; k < n; k++) {
        const key = keys[k];
        let arr = buckets.get(key); if (!arr) { arr = []; buckets.set(key, arr); }
        arr.push(k);
      }
      const groups: Array<{ style: string; idx: Int32Array }> = [];
      buckets.forEach((arr, key) => {
        const r = ((key >> 10) & 31) << 3, g = ((key >> 5) & 31) << 3, b = (key & 31) << 3;
        groups.push({ style: `rgb(${r},${g},${b})`, idx: Int32Array.from(arr) });
      });
      particleData = { n, hx, hy, aspect: cw / ch, groups };
    };

    if (!reduce) {
      const hyImg = new Image();
      hyImg.onload = () => { try { sampleHyacinth(hyImg); } catch { /* noop */ } };
      hyImg.src = '/assets/hyacinth.png';
    }

    const PARTI = { converge: 900, hold: 360, disperse: 1100 };
    const smooth = (x: number) => x * x * (3 - 2 * x);
    const startParticles = (): boolean => {
      if (!particleData || !pcanvas) return false;
      const ctx = pcanvas.getContext('2d');
      if (!ctx) return false;
      const pd = particleData;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const vw = window.innerWidth, vh = window.innerHeight;
      pcanvas.width = Math.round(vw * dpr); pcanvas.height = Math.round(vh * dpr);
      ctx.scale(dpr, dpr);
      const cx = vw / 2, cy = vh / 2;
      const boxH = vh * 0.72, boxW = boxH * pd.aspect;
      const N = pd.n, hx = pd.hx, hy = pd.hy, groups = pd.groups;
      const homeX = new Float32Array(N), homeY = new Float32Array(N);
      const sX = new Float32Array(N), sY = new Float32Array(N);
      const seed = new Float32Array(N), dX = new Float32Array(N), dY = new Float32Array(N);
      for (let i = 0; i < N; i++) {
        const px = cx + hx[i] * boxW, py = cy + hy[i] * boxH;
        homeX[i] = px; homeY[i] = py;
        sX[i] = Math.random() * vw; sY[i] = Math.random() * vh; // scattered = TV-snow start
        seed[i] = Math.random();
        const ex = px - cx, ey = py - cy, len = Math.hypot(ex, ey) || 1;
        dX[i] = ex / len + (Math.random() - 0.5) * 0.7; // disperse radially outward + jitter
        dY[i] = ey / len + (Math.random() - 0.5) * 0.7;
      }
      const size = Math.max(1.4, vh / 520);
      const total = PARTI.converge + PARTI.hold + PARTI.disperse;
      const t0 = performance.now();
      const draw = (now: number) => {
        if (disposed) return;
        const e = now - t0;
        ctx.clearRect(0, 0, vw, vh);
        let phase: 0 | 1 | 2, prog: number;
        if (e < PARTI.converge) { phase = 0; prog = e / PARTI.converge; }
        else if (e < PARTI.converge + PARTI.hold) { phase = 1; prog = 0; }
        else { phase = 2; prog = Math.min(1, (e - PARTI.converge - PARTI.hold) / PARTI.disperse); }
        ctx.globalAlpha = phase === 2 ? 1 - prog : 1;
        const dist = phase === 2 ? prog * prog * vh * 0.95 : 0;
        const breathe = phase === 1 ? Math.sin(e * 0.012) * 1.2 : 0;
        for (const grp of groups) {
          ctx.fillStyle = grp.style;
          const idx = grp.idx;
          for (let j = 0; j < idx.length; j++) {
            const i = idx[j];
            let x: number, y: number;
            if (phase === 0) {
              const local = (prog - seed[i] * 0.34) / 0.66;
              const te = local <= 0 ? 0 : local >= 1 ? 1 : smooth(local);
              x = sX[i] + (homeX[i] - sX[i]) * te;
              y = sY[i] + (homeY[i] - sY[i]) * te;
            } else if (phase === 1) {
              x = homeX[i] + Math.sin(seed[i] * 6.28 + e * 0.004) * breathe;
              y = homeY[i] + Math.cos(seed[i] * 6.28 + e * 0.004) * breathe;
            } else {
              x = homeX[i] + dX[i] * dist;
              y = homeY[i] + dY[i] * dist;
            }
            ctx.fillRect(x, y, size, size);
          }
        }
        ctx.globalAlpha = 1;
        if (e < total) praf = requestAnimationFrame(draw);
      };
      praf = requestAnimationFrame(draw);
      return true;
    };

    // ---- sign-off orchestration -------------------------------------------
    const teardown = () => {
      document.documentElement.classList.remove('coldopen-playing');
      audio?.stopAll();
      if (root.parentNode) root.parentNode.removeChild(root);
    };
    const handoff = () => {
      // screen is committed to clearing; page mounted underneath. Let
      // HyacinthClient lift its overture + carve the hero in lock-step.
      (window as any).__coldOpenDone = true;
      try { document.dispatchEvent(new CustomEvent('hy:coldopen-done')); } catch { /* noop */ }
    };

    // Fallback when the image isn't ready: a clean fade to black, then reveal.
    const signoffSimple = () => {
      root.classList.add('blackout');
      handoff();
      timers.push(window.setTimeout(() => { root.classList.add('birthing'); audio?.resolveChime(); }, 820));
      timers.push(window.setTimeout(teardown, 820 + 1100 + 140));
    };

    // The brilliant path: TV snow -> hyacinth point-cloud -> disperse -> site.
    const signoffParticles = () => {
      root.classList.add('particling');
      handoff();
      if (!startParticles()) { signoffSimple(); return; }
      audio?.staticHiss((PARTI.converge + PARTI.hold) / 1000, 0.16);
      // once the flower has formed + held, disperse it as the reel fades away
      timers.push(window.setTimeout(() => {
        root.classList.add('birthing');
        audio?.resolveChime();
      }, PARTI.converge + PARTI.hold));
      timers.push(window.setTimeout(teardown, PARTI.converge + PARTI.hold + PARTI.disperse + 160));
    };

    // Sign-off: hard zoom-cut + broken-signal flicker -> TV static -> the snow
    // resolves into the hyacinth cloud, converges, then disperses to the site.
    const finish = () => {
      if (ended) return;
      ended = true;
      clearAll();

      // 1./2. hard cut to fullscreen + the signal breaks up
      flashCut();
      root.classList.add('ending');
      audio?.click();
      audio?.staticHiss(0.5, 0.1);

      // 3. collapse to TV static
      timers.push(window.setTimeout(() => {
        showOnly('static');
        root.classList.add('static-takeover');
        audio?.staticHiss(0.7, 0.2);
      }, 520));

      // 4./5./6. snow -> hyacinth particle cloud -> disperse -> reveal site
      timers.push(window.setTimeout(() => {
        if (particleData && pcanvas) signoffParticles();
        else signoffSimple();
      }, 1040));
    };

    // scene timeline: [frameId, holdMs, glitchCutBefore, soundFn]
    const scenes: Array<[string, number, boolean, () => void]> = [
      ['static', 640, false, () => { audio?.powerOn(); audio?.staticHiss(0.7); }],
      ['bars', 1320, true, () => { audio?.click(); audio?.tone(1000, 0.18); audio?.staticHiss(1.3, 0.08); }],
      // HYACINTH spells itself out, one coloured letter at a time (accelerating)
      ['spell', 2500, true, () => { revealSpell(); }],
      ['signon', 1340, true, () => { audio?.click(); audio?.neonHum(1.5); }],
    ];

    let t = 300; // tube warm-up
    scenes.forEach((s) => {
      if (s[2]) timers.push(window.setTimeout(flashCut, t - 60));
      timers.push(window.setTimeout(() => { showOnly(s[0]); s[3](); }, t));
      t += s[1];
    });
    timers.push(window.setTimeout(finish, t));

    return () => {
      ended = true;
      disposed = true;
      if (praf) cancelAnimationFrame(praf);
      clearAll();
      sBtn?.removeEventListener('click', onSound);
      document.documentElement.classList.remove('coldopen-playing');
      audio?.stopAll();
      if (root.parentNode) root.parentNode.removeChild(root);
    };
  }, []);

  return null;
}
