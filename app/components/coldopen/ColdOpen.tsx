'use client';

/*
 * COLD OPEN v2 — React port of the standalone TV Intro bundle.
 *
 * Plays once per browser session, exposes the same public hook as the
 * standalone (`window.__hyIntro2`), and fires `hy:intro2-done` when the reel
 * melts into the Hyacinth page.
 */

import { useEffect } from 'react';
import { coldOpenWillPlay } from './coldOpenState';
import type { ColdOpenContent } from '@/lib/content';

/* eslint-disable @typescript-eslint/no-explicit-any */

const COLD_OPEN_ROOT_ID = 'crt2-root';
const POST_INTRO_AUDIO_ID = 'post-intro-track-audio';
const POST_INTRO_TOGGLE_ID = 'post-intro-track-toggle';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function markup(content: ColdOpenContent): string {
  const noSignal = escapeHtml(content.no_signal);
  const barsCorner = escapeHtml(content.bars_corner);
  const timecode = escapeHtml(content.timecode);
  const presents = escapeHtml(content.presents);
  const loading = escapeHtml(content.loading);
  const startLabel = escapeHtml(content.start_label);
  const soundToggleLabel = escapeHtml(content.sound_toggle_label);
  const soundLabel = escapeHtml(content.sound_label);

  return '' +
    '<div class="crt2-screen">' +
      '<div class="crt2-pic">' +
        '<div class="crt2-frame f2-static on" data-f="static">' +
          '<span class="no-sig">' + noSignal + '</span>' +
        '</div>' +

        '<div class="crt2-frame f2-bars" data-f="bars">' +
          '<div class="bars2-main"><i class="b1"></i><i class="b2"></i><i class="b3"></i><i class="b4"></i><i class="b5"></i><i class="b6"></i><i class="b7"></i></div>' +
          '<div class="bars2-mid"><i class="m1"></i><i class="m2"></i><i class="m3"></i><i class="m4"></i><i class="m5"></i><i class="m6"></i><i class="m7"></i></div>' +
          '<div class="bars2-low"><span class="pluge"></span><span class="white"></span><span class="blk"></span></div>' +
          '<div class="bars2-corner">' + barsCorner + '</div>' +
          '<div class="bars2-tc">' + timecode + '</div>' +
          '<div class="lower2"><span>' + presents + '</span></div>' +
        '</div>' +

        '<div class="crt2-frame f2-spell" data-f="spell">' +
          '<div class="load2-stack">' +
            '<div class="load2-cap">' + loading + '</div>' +
            '<div class="load2"><span class="load2-num">0</span><span class="load2-pct">%</span></div>' +
            '<div class="load2-bar"><i class="load2-fill"></i></div>' +
          '</div>' +
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
    '<button class="crt2-start" type="button">' +
      '<span>' + startLabel + '</span>' +
    '</button>' +
    '<button class="crt2-sound on" type="button" aria-label="' + soundToggleLabel + '">' +
      '<span class="eq"><i></i><i></i><i></i></span><span class="lbl">' + soundLabel + '</span>' +
    '</button>';
}

interface ColdOpenAudio {
  setMuted: (m: boolean) => void;
  resumeOnGesture: () => void;
  tryResume: () => Promise<void>;
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
    const noopAsync = () => Promise.resolve();
    return {
      setMuted: noop, resumeOnGesture: noop, tryResume: noopAsync,
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
    node.onended = () => {
      const i = live.indexOf(node);
      if (i > -1) live.splice(i, 1);
    };
  };

  const tryResume = async () => {
    if (ctx.state !== 'suspended') return;
    try {
      await ctx.resume();
    } catch {
      /* audio optional */
    }
  };
  const afterResume = (fn: () => void) => {
    void tryResume();
    fn();
  };
  const resumeOnGesture = () => {
    const fn = () => {
      void tryResume();
    };
    (['pointerdown', 'keydown', 'touchstart', 'mousemove', 'wheel'] as const).forEach((ev) => {
      window.addEventListener(ev, fn, { once: true, passive: true });
    });
  };
  const setMuted = (m: boolean) => {
    master.gain.cancelScheduledValues(now());
    master.gain.linearRampToValueAtTime(m ? 0.0001 : 0.5, now() + 0.12);
  };

  const powerOn = () => {
    afterResume(() => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(150, now());
      o.frequency.exponentialRampToValueAtTime(42, now() + 0.22);
      g.gain.setValueAtTime(0.0001, now());
      g.gain.exponentialRampToValueAtTime(0.6, now() + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, now() + 0.4);
      o.connect(g);
      g.connect(master);
      o.start();
      o.stop(now() + 0.42);
      track(o);

      const o2 = ctx.createOscillator();
      const g2 = ctx.createGain();
      o2.type = 'triangle';
      o2.frequency.setValueAtTime(1600, now());
      o2.frequency.exponentialRampToValueAtTime(520, now() + 0.18);
      g2.gain.setValueAtTime(0.0001, now());
      g2.gain.exponentialRampToValueAtTime(0.12, now() + 0.01);
      g2.gain.exponentialRampToValueAtTime(0.0001, now() + 0.22);
      o2.connect(g2);
      g2.connect(master);
      o2.start();
      o2.stop(now() + 0.24);
      track(o2);
    });
  };

  const staticHiss = (dur: number, level = 0.16) => {
    afterResume(() => {
      const src = ctx.createBufferSource();
      src.buffer = noiseBuf;
      src.loop = true;
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 3200;
      bp.Q.value = 0.6;
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 1100;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, now());
      g.gain.exponentialRampToValueAtTime(level, now() + 0.05);
      g.gain.setValueAtTime(level, now() + dur - 0.12);
      g.gain.exponentialRampToValueAtTime(0.0001, now() + dur);
      src.connect(bp);
      bp.connect(hp);
      hp.connect(g);
      g.connect(master);
      src.start();
      src.stop(now() + dur + 0.02);
      track(src);
    });
  };

  const tone = (freq: number, dur: number) => {
    afterResume(() => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      const t0 = now();
      const attack = Math.min(0.01, Math.max(0.004, dur * 0.35));
      const hold = Math.max(attack + 0.001, dur - 0.04);
      const end = Math.max(dur, attack + 0.002);
      o.type = 'sine';
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.14, t0 + attack);
      g.gain.setValueAtTime(0.14, t0 + hold);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + end);
      o.connect(g);
      g.connect(master);
      o.start();
      o.stop(t0 + end + 0.02);
      track(o);
    });
  };

  const click = () => {
    afterResume(() => {
      const src = ctx.createBufferSource();
      src.buffer = noiseBuf;
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 1800;
      bp.Q.value = 1.4;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, now());
      g.gain.exponentialRampToValueAtTime(0.4, now() + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, now() + 0.07);
      src.connect(bp);
      bp.connect(g);
      g.connect(master);
      src.start();
      src.stop(now() + 0.09);
      track(src);
    });
  };

  const neonHum = (dur: number) => {
    afterResume(() => {
      [60, 120, 119.3].forEach((f, i) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = i === 0 ? 'sine' : 'sawtooth';
        o.frequency.value = f;
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 320;
        g.gain.setValueAtTime(0.0001, now());
        g.gain.exponentialRampToValueAtTime(i === 0 ? 0.14 : 0.05, now() + 0.25);
        g.gain.setValueAtTime(g.gain.value, now() + dur - 0.3);
        g.gain.exponentialRampToValueAtTime(0.0001, now() + dur);
        o.connect(lp);
        lp.connect(g);
        g.connect(master);
        o.start();
        o.stop(now() + dur + 0.05);
        track(o);
      });
    });
  };

  const resolveChime = () => {
    afterResume(() => {
      [392.0, 523.25, 659.25].forEach((f, i) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'sine';
        o.frequency.value = f;
        const t0 = now() + i * 0.1;
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(0.16, t0 + 0.03);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.9);
        o.connect(g);
        g.connect(master);
        o.start(t0);
        o.stop(t0 + 0.95);
        track(o);
      });
    });
  };

  const stopAll = () => {
    live.slice().forEach((n) => {
      try {
        n.stop();
      } catch {
        /* noop */
      }
    });
    live = [];
    setTimeout(() => {
      try {
        ctx.close();
      } catch {
        /* noop */
      }
    }, 60);
  };

  return {
    setMuted, resumeOnGesture, tryResume,
    powerOn, staticHiss, tone, click, neonHum, resolveChime, stopAll,
  };
}

interface PostIntroPlayer {
  prime: () => void;
  play: () => void;
  playFromStart: () => void;
  reset: () => void;
  destroy: () => void;
}

function makePostIntroPlayer(content: ColdOpenContent): PostIntroPlayer | null {
  const src = content.post_intro_track_src.trim();
  if (!src) return null;

  document.getElementById(POST_INTRO_AUDIO_ID)?.remove();
  document.getElementById(POST_INTRO_TOGGLE_ID)?.remove();

  const audio = document.createElement('audio');
  audio.id = POST_INTRO_AUDIO_ID;
  audio.src = src;
  audio.preload = 'auto';
  audio.volume = 0.52;

  const button = document.createElement('button');
  button.id = POST_INTRO_TOGGLE_ID;
  button.className = 'post-intro-track';
  button.type = 'button';
  button.hidden = true;
  button.innerHTML =
    '<span class="post-intro-track-eq" aria-hidden="true"><i></i><i></i><i></i></span>' +
    '<span class="post-intro-track-copy">' +
      '<span class="post-intro-track-label">' + escapeHtml(content.post_intro_track_label) + '</span>' +
      '<span class="post-intro-track-title">' + escapeHtml(content.post_intro_track_title) + '</span>' +
    '</span>';

  const setPlaying = (playing: boolean, visible = true) => {
    button.hidden = !visible;
    button.classList.toggle('is-playing', playing);
    button.setAttribute(
      'aria-label',
      playing ? content.post_intro_track_pause_label : content.post_intro_track_play_label,
    );
  };

  const rewind = () => {
    try {
      audio.currentTime = 0;
    } catch {
      /* noop */
    }
  };

  const play = () => {
    button.hidden = false;
    audio.play()
      .then(() => setPlaying(true))
      .catch(() => setPlaying(false));
  };

  const playFromStart = () => {
    audio.pause();
    rewind();
    play();
  };

  const reset = () => {
    audio.pause();
    rewind();
    setPlaying(false, false);
  };

  const onToggle = () => {
    if (audio.paused) {
      play();
      return;
    }
    audio.pause();
    setPlaying(false);
  };
  const onPlay = () => setPlaying(true);
  const onPause = () => setPlaying(false);
  const onEnded = () => setPlaying(false);
  const onError = () => setPlaying(false);

  button.addEventListener('click', onToggle);
  audio.addEventListener('play', onPlay);
  audio.addEventListener('pause', onPause);
  audio.addEventListener('ended', onEnded);
  audio.addEventListener('error', onError);

  document.body.appendChild(audio);
  document.body.appendChild(button);
  setPlaying(false, false);

  return {
    prime: () => {
      try {
        audio.load();
      } catch {
        /* noop */
      }
    },
    play,
    playFromStart,
    reset,
    destroy: () => {
      button.removeEventListener('click', onToggle);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
      audio.pause();
      button.remove();
      audio.remove();
    },
  };
}

interface ColdOpenProps {
  content: ColdOpenContent;
}

export default function ColdOpen({ content }: ColdOpenProps) {
  useEffect(() => {
    const willPlay = coldOpenWillPlay();
    let root: HTMLDivElement | null = null;
    let cut: HTMLElement | null = null;
    let frames: Record<string, HTMLElement> = {};
    let timers: number[] = [];
    let ended = false;
    let audio: ReturnType<typeof makeAudio> | null = null;
    let muted = false;
    let startCleanup: (() => void) | null = null;
    let postIntroPlayer: PostIntroPlayer | null = null;
    let gateShown = false;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const getRoot = () => document.getElementById(COLD_OPEN_ROOT_ID) as HTMLDivElement | null;
    const prepareRoot = (preboot = false) => {
      const existing = getRoot();
      const node = existing ?? document.createElement('div');
      node.id = COLD_OPEN_ROOT_ID;
      node.className = preboot ? 'crt2 crt2-preboot' : 'crt2';
      node.removeAttribute('aria-hidden');
      node.innerHTML = markup(content);
      if (!existing) document.body.prepend(node);
      root = node;
      return node;
    };
    const hideRoot = (node: HTMLDivElement | null = root) => {
      if (!node) return;
      node.className = 'crt2 crt2-gone';
      node.setAttribute('aria-hidden', 'true');
      node.innerHTML = '';
    };
    const clearAll = () => {
      timers.forEach((t) => clearTimeout(t));
      timers = [];
    };
    const showOnly = (id: string) => {
      for (const k in frames) frames[k].classList.toggle('on', k === id);
    };
    const flashCut = () => {
      if (!cut) return;
      cut.classList.remove('flash');
      void cut.offsetWidth;
      cut.classList.add('flash');
    };
    const teardown = () => {
      audio?.stopAll();
      audio = null;
      hideRoot();
      root = null;
      cut = null;
      frames = {};
    };

    const melt = () => {
      if (ended || !root) return;
      ended = true;
      clearAll();
      startCleanup?.();
      startCleanup = null;
      audio?.resolveChime();
      (window as any).__hyIntro2.done = true;
      document.documentElement.classList.remove('intro2-playing');
      try {
        document.dispatchEvent(new CustomEvent('hy:intro2-done'));
      } catch {
        /* noop */
      }
      root.classList.add('melting');
      timers.push(window.setTimeout(teardown, 1000));
    };

    const showStartGate = () => {
      if (ended || !root || gateShown) return;
      gateShown = true;
      root.classList.add('ready-to-play');

      const startButton = root.querySelector<HTMLButtonElement>('.crt2-start');
      let pressed = false;
      const begin = (event?: Event) => {
        event?.preventDefault();
        if (pressed) return;
        pressed = true;
        startButton?.setAttribute('disabled', 'true');
        postIntroPlayer?.playFromStart();
        audio?.stopAll();
        audio = null;
        melt();
      };

      startButton?.addEventListener('click', begin);
      startCleanup = () => startButton?.removeEventListener('click', begin);
      window.setTimeout(() => startButton?.focus({ preventScroll: true }), 0);
    };

    const runLoad = () => {
      if (!root) return;
      const frame = root.querySelector<HTMLElement>('.f2-spell');
      const numEl = root.querySelector<HTMLElement>('.load2-num');
      const fillEl = root.querySelector<HTMLElement>('.load2-fill');
      if (!frame || !numEl) return;

      const palette = ['c-green', 'c-blue', 'c-pink'];
      const vals = [0];
      let v = 0;
      while (v < 100) {
        const jump = Math.random() < 0.45 ? 1 : 1 + Math.floor(Math.random() * 9);
        v = Math.min(100, v + jump);
        vals.push(v);
      }

      let i = 0;
      let prevColor = -1;
      const step = () => {
        if (!root || i >= vals.length) {
          timers.push(window.setTimeout(showStartGate, 620));
          return;
        }
        const val = vals[i];
        numEl.textContent = String(val);
        if (fillEl) fillEl.style.width = `${val}%`;

        let c = Math.floor(Math.random() * 3);
        if (c === prevColor) c = (c + 1) % 3;
        prevColor = c;
        frame.classList.remove('c-green', 'c-blue', 'c-pink');
        frame.classList.add(palette[c]);
        audio?.tone(620 + val * 6, 0.035);
        i++;

        const dwell = Math.random() < 0.18
          ? 240 + Math.random() * 320
          : 55 + Math.random() * 120;
        timers.push(window.setTimeout(step, dwell));
      };
      step();
    };

    const play = () => {
      if (root?.classList.contains('is-running')) return;
      startCleanup?.();
      startCleanup = null;
      ended = false;
      gateShown = false;
      timers = [];

      root = prepareRoot();
      root.classList.add('is-running');
      root.classList.remove('ready-to-play');
      postIntroPlayer = postIntroPlayer ?? makePostIntroPlayer(content);
      postIntroPlayer?.reset();
      postIntroPlayer?.prime();
      document.documentElement.classList.remove('intro2-skip');
      document.documentElement.classList.add('intro2-playing');
      (window as any).__hyIntro2.done = false;

      cut = root.querySelector<HTMLElement>('.crt2-cut');
      frames = {};
      root.querySelectorAll<HTMLElement>('.crt2-frame').forEach((f) => {
        frames[f.dataset.f as string] = f;
      });

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
      sBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        muted = !muted;
        sBtn.classList.toggle('on', !muted);
        sBtn.classList.toggle('muted', muted);
        if (sLbl) sLbl.textContent = muted ? content.sound_muted_label : content.sound_label;
        audio?.setMuted(muted);
      });

      audio = makeAudio();
      audio.setMuted(muted);
      audio.resumeOnGesture();
      void audio.tryResume();

      const scenes: Array<[string, number, boolean, () => void]> = [
        ['static', 640, false, () => { audio?.powerOn(); audio?.staticHiss(0.7); }],
        ['bars', 1320, true, () => { audio?.click(); audio?.tone(1000, 0.18); audio?.staticHiss(1.3, 0.08); }],
        ['spell', 2600, true, () => {
          audio?.click();
          audio?.staticHiss(8.8, 0.055);
          audio?.neonHum(8.8);
          runLoad();
        }],
      ];

      let t = 300;
      scenes.forEach((s) => {
        if (s[2]) timers.push(window.setTimeout(flashCut, t - 60));
        timers.push(window.setTimeout(() => {
          showOnly(s[0]);
          s[3]();
        }, t));
        t += s[1];
      });
    };

    const replay = () => {
      if (root?.classList.contains('is-running')) return;
      (window as any).__hyIntro2.done = false;
      play();
    };

    (window as any).__hyIntro2 = {
      willPlay,
      done: !willPlay,
      replay,
      play,
    };

    if (willPlay) {
      play();
    } else {
      hideRoot(getRoot());
    }

    return () => {
      ended = true;
      startCleanup?.();
      startCleanup = null;
      clearAll();
      document.documentElement.classList.remove('intro2-playing');
      document.documentElement.classList.remove('intro2-skip');
      postIntroPlayer?.destroy();
      postIntroPlayer = null;
      teardown();
    };
  }, [content]);

  return (
    <div
      id={COLD_OPEN_ROOT_ID}
      className="crt2 crt2-preboot"
      dangerouslySetInnerHTML={{ __html: markup(content) }}
    />
  );
}
