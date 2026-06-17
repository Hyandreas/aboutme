'use client';

/*
 * HYACINTH — the scroll-driven 3D experience.
 *
 * A faithful React port of the design bundle's Hyacinth.html. The WebGL scene
 * lives in ./hyacinth3d (vanilla three.js, dynamically imported client-side so
 * its browser globals never run during SSR). A single smoothed scroll value
 * (api.getSmooth) drives both the camera orbit and the crossfading DOM "beats".
 *
 * All markup is nested under .hy so the scoped stylesheet (./hyacinth.css)
 * cannot leak into the rest of the site, and the loop mutates singletons via
 * refs rather than document ids.
 */

import Link from 'next/link';
import React, { useEffect, useRef } from 'react';
import './hyacinth.css';
import { coldOpenWillPlay } from '../coldopen/coldOpenState';

export interface WorkItem {
  year: string;
  title: string;
  meta: string;
  description: string;
  link: string;
}
export interface Thread {
  title: string;
  note: string;
}
/** Every editable string on the homepage. Mirrors content/home.md frontmatter. */
export interface HomeContent {
  brand: string;
  nav_contact: string;
  nav_projects: string;
  overture: string;
  rail_left: string;
  scroll_hint: string;
  bloom_hint: string;
  chapters: string[];
  hero_index: string;
  hero_eyebrow: string;
  hero_name: string;
  hero_lead: string;
  hero_meta: string[];
  about_index: string;
  about_eyebrow: string;
  about_lede: string[];
  about_sub: string;
  bio_index: string;
  bio_eyebrow: string;
  bio_title: string;
  bio: string;
  interests_index: string;
  interests_eyebrow: string;
  interests_title: string[];
  interests: Thread[];
  bloom_index: string;
  bloom_eyebrow: string;
  bloom_lede: string[];
  bloom_sub: string;
  work_index: string;
  work_eyebrow: string;
  work_title: string[];
  work: WorkItem[];
  finale_index: string;
  finale_eyebrow: string;
  finale_title: string;
  finale_sub: string;
  finale_cta: string;
  footer_index: string;
  footer_eyebrow: string;
  footer_title: string;
  footer_sub: string;
  email: string;
  discord: string;
  github: string;
  linkedin: string;
  instagram: string;
  footer_projects: string;
  footer_copyright: string;
}

// Render *emphasis* as <em> (the lilac-gradient word in the interlude ledes).
function emphasize(text: string, k: string): React.ReactNode[] {
  return text
    .split(/(\*[^*]+\*)/g)
    .filter((s) => s.length > 0)
    .map((part, i) =>
      part.startsWith('*') && part.endsWith('*') && part.length > 2 ? (
        <em key={`${k}${i}`}>{part.slice(1, -1)}</em>
      ) : (
        <React.Fragment key={`${k}${i}`}>{part}</React.Fragment>
      ),
    );
}

// Render an array of lines with <br/> between, each line emphasis-parsed.
function multiline(arr: string[]): React.ReactNode {
  return arr.map((ln, i) => (
    <React.Fragment key={i}>
      {i > 0 && <br />}
      {emphasize(ln, `e${i}_`)}
    </React.Fragment>
  ));
}

export default function HyacinthClient({ content }: { content: HomeContent }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const driverRef = useRef<HTMLDivElement>(null);

  // loop-driven singletons
  const progressRef = useRef<HTMLDivElement>(null);
  const meterRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLSpanElement>(null);
  const hintRef = useRef<HTMLDivElement>(null);
  const bloomHintRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const hitRef = useRef<HTMLDivElement>(null);
  const overtureRef = useRef<HTMLDivElement>(null);
  const ovCountRef = useRef<HTMLSpanElement>(null);
  const heroNameRef = useRef<HTMLHeadingElement>(null);
  const soundBtnRef = useRef<HTMLButtonElement>(null);
  const soundLabelRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    document.body.classList.add('hy-active');
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let disposed = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let api: any = null;
    let rafId = 0;
    let railNow = '';
    const cleanups: Array<() => void> = [];
    const timers: Array<() => void> = [];

    const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
    const smoothstep = (t: number) => {
      t = clamp01(t);
      return t * t * (3 - 2 * t);
    };

    (async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mod: any = await import('./hyacinth3d');
      if (disposed) return;

      const canvas = canvasRef.current;
      const driver = driverRef.current;
      const root = rootRef.current;
      if (!canvas || !driver || !root) return;

      // tall invisible driver produces the real scrollbar for the scene.
      // Long enough that the camera's two full revolutions stay slow + legible.
      driver.style.height = '1600vh';

      const scroller = () => document.scrollingElement || document.documentElement;
      const rawProgress = () => {
        const max = driver.offsetHeight - window.innerHeight;
        return max > 0 ? clamp01(scroller().scrollTop / max) : 0;
      };

      api = mod.initHyacinth({ canvas, getProgress: rawProgress });
      if (disposed) {
        if (api && api.dispose) api.dispose();
        return;
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).__hy = api;

      // build the point cloud from the real photograph
      if (api && api.loadImage) api.loadImage('/assets/hyacinth.png');

      // ---- beats ----
      const beats = Array.from(root.querySelectorAll<HTMLElement>('.beat')).map((el) => ({
        el,
        s: parseFloat(el.dataset.start || '0'),
        e: parseFloat(el.dataset.end || '0'),
      }));
      const FADE = 0.045;
      const beatOpacity = (P: number, s: number, e: number) => {
        if (P < s - FADE || P > e + FADE) return 0;
        return Math.min(smoothstep((P - (s - FADE)) / FADE), smoothstep((e + FADE - P) / FADE));
      };

      const progressEl = progressRef.current;
      const meterEl = meterRef.current;
      const railEl = railRef.current;
      const hintEl = hintRef.current;
      const bloomHintEl = bloomHintRef.current;
      const glowEl = glowRef.current;
      const hitEl = hitRef.current;
      const overtureEl = overtureRef.current;
      const ovCountEl = ovCountRef.current;
      const heroNameEl = heroNameRef.current;
      const soundBtnEl = soundBtnRef.current;
      const soundLabelEl = soundLabelRef.current;

      // chapter labels come from content; the breakpoints are fixed to the beats
      const CHAP_P = [0.0, 0.12, 0.24, 0.4, 0.56, 0.68, 0.88];
      const CHAPTERS = CHAP_P.map((p, i) => ({ p, t: content.chapters[i] || '' }));

      const tick = () => {
        rafId = requestAnimationFrame(tick);
        const P = api && api.getSmooth ? api.getSmooth() : rawProgress();

        for (const b of beats) {
          const o = beatOpacity(P, b.s, b.e);
          b.el.style.opacity = o.toFixed(3);
          b.el.classList.toggle('is-active', o > 0.04);
        }

        if (progressEl) progressEl.style.width = (P * 100).toFixed(2) + '%';
        if (meterEl) meterEl.textContent = String(Math.round(P * 100)).padStart(2, '0') + ' / 100';

        let ch = CHAPTERS[0].t;
        for (const c of CHAPTERS) if (P >= c.p) ch = c.t;
        if (ch !== railNow) {
          railNow = ch;
          if (railEl) railEl.textContent = ch;
        }

        const introFade = 1 - smoothstep(P / 0.05);
        if (hintEl) hintEl.style.opacity = String(introFade);
        if (bloomHintEl && !bloomHintEl.dataset.done) {
          bloomHintEl.style.opacity = String((1 - smoothstep(P / 0.08)) * 0.9);
        }
      };
      tick();

      // ---- bloom pulse on click ----
      const onHit = () => {
        if (api && api.triggerBloom) api.triggerBloom();
      };
      hitEl?.addEventListener('click', onHit);
      cleanups.push(() => hitEl?.removeEventListener('click', onHit));

      const onBloom = () => {
        if (bloomHintEl) {
          bloomHintEl.dataset.done = '1';
          bloomHintEl.style.opacity = '0';
        }
        if (glowEl) {
          glowEl.classList.remove('fire');
          glowEl.getBoundingClientRect(); // force reflow so the animation can re-fire
          glowEl.classList.add('fire');
        }
      };
      document.addEventListener('hyacinth:bloom', onBloom);
      cleanups.push(() => document.removeEventListener('hyacinth:bloom', onBloom));

      // ---- sound toggle ----
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).__hySound = true;
      const onSound = () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const on = !(window as any).__hySound;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).__hySound = on;
        if (soundBtnEl) {
          soundBtnEl.classList.toggle('on', on);
          soundBtnEl.setAttribute('aria-pressed', on ? 'true' : 'false');
        }
        if (soundLabelEl) soundLabelEl.textContent = on ? 'Sound' : 'Muted';
      };
      soundBtnEl?.addEventListener('click', onSound);
      cleanups.push(() => soundBtnEl?.removeEventListener('click', onSound));

      // ---- overture choreography ----
      const carveHero = () => {
        if (reduceMotion || !heroNameEl) return;
        heroNameEl.querySelectorAll<HTMLElement>('.ln').forEach((ln, li) => {
          const text = ln.textContent || '';
          ln.setAttribute('aria-label', text);
          let html = '';
          Array.from(text).forEach((c, i) => {
            html +=
              '<span class="drop" style="--i:' +
              i +
              ';--d:' +
              li * 0.18 +
              's;">' +
              (c === ' ' ? '&nbsp;' : c) +
              '</span>';
          });
          ln.innerHTML = html;
        });
      };

      const runOverture = () => {
        if (!overtureEl) return;
        if (coldOpenWillPlay()) {
          const liftAfterColdOpen = () => {
            carveHero();
            overtureEl.classList.add('lift');
            const goneTimer = setTimeout(() => overtureEl.classList.add('gone'), 1300);
            timers.push(() => clearTimeout(goneTimer));
          };

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          if ((window as any).__coldOpenDone) {
            liftAfterColdOpen();
          } else {
            document.addEventListener('hy:coldopen-done', liftAfterColdOpen, { once: true });
            cleanups.push(() => document.removeEventListener('hy:coldopen-done', liftAfterColdOpen));
          }
          return;
        }

        if (reduceMotion) {
          carveHero();
          overtureEl.classList.add('lift', 'gone');
          return;
        }
        const dur = 1500;
        const t0 = performance.now();
        const iv = setInterval(() => {
          const k = clamp01((performance.now() - t0) / dur);
          if (ovCountEl) ovCountEl.textContent = String(Math.round(smoothstep(k) * 100)).padStart(2, '0');
          if (k >= 1) clearInterval(iv);
        }, 40);
        timers.push(() => clearInterval(iv));

        const to1 = setTimeout(() => {
          carveHero();
          const to2 = setTimeout(() => {
            heroNameEl?.querySelectorAll<HTMLElement>('.drop').forEach((d) => {
              d.style.animation = 'none';
              d.style.opacity = '1';
            });
          }, 1300);
          timers.push(() => clearTimeout(to2));
          overtureEl.classList.add('lift');
          const to3 = setTimeout(() => overtureEl.classList.add('gone'), 1300);
          timers.push(() => clearTimeout(to3));
        }, dur + 200);
        timers.push(() => clearTimeout(to1));
      };
      const to0 = setTimeout(runOverture, 60);
      timers.push(() => clearTimeout(to0));
    })();

    return () => {
      disposed = true;
      document.body.classList.remove('hy-active');
      if (rafId) cancelAnimationFrame(rafId);
      timers.forEach((fn) => {
        try {
          fn();
        } catch {
          /* noop */
        }
      });
      cleanups.forEach((fn) => {
        try {
          fn();
        } catch {
          /* noop */
        }
      });
      if (api && api.dispose) api.dispose();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).__hy = undefined;
    };
    // content is read once at mount (chapter labels); the 3D scene initialises a
    // single time and never needs to re-run on a prop change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const nameLines = content.hero_name.trim().split(/\s+/);

  return (
    <div className="hy" ref={rootRef}>
      {/* WebGL scene */}
      <canvas id="vault-gl" ref={canvasRef} />
      <div className="votive-fallback" />
      <div className="vignette" />
      <div className="grain" />

      {/* click-catcher: anywhere wakes the bloom */}
      <div className="bloom-hit" ref={hitRef} aria-hidden="true" />
      <div className="bloom-glow" ref={glowRef} aria-hidden="true" />
      <div className="progress" ref={progressRef} />

      {/* OVERTURE — the entrance curtain */}
      <div className="overture" ref={overtureRef} aria-hidden="true">
        <div className="ov-stack">
          <span className="ov-spec">{content.overture}</span>
          <div className="ov-seed" />
          <span className="ov-count" ref={ovCountRef}>
            00
          </span>
        </div>
      </div>

      {/* fixed chrome */}
      <header className="topbar">
        <Link className="wordmark lead-mark" href="/">
          {content.brand}
        </Link>
        <nav className="topnav">
          <a className="nav-x" href="#contact">
            {content.nav_contact}
          </a>
          <Link className="nav-x" href="/projects">
            {content.nav_projects}
          </Link>
        </nav>
      </header>

      <button className="sound-toggle on" ref={soundBtnRef} aria-pressed="true" aria-label="Toggle sound">
        <span className="sound-eq">
          <i />
          <i />
          <i />
        </span>
        <span ref={soundLabelRef}>Sound</span>
      </button>

      <span className="rail left">{content.rail_left}</span>
      <span className="rail right" ref={railRef}>
        {content.chapters[0]}
      </span>

      <div className="scroll-hint" ref={hintRef}>
        <span>{content.scroll_hint}</span>
        <span className="chev" />
      </div>
      <div className="bloom-hint" ref={bloomHintRef}>
        {content.bloom_hint}
      </div>
      <div className="descent-meter" ref={meterRef}>
        00 / 100
      </div>

      {/* the pinned stage of crossfading beats */}
      <div className="stage">
        {/* HERO */}
        <section
          className="beat hero"
          data-side="left"
          data-start="0.0"
          data-end="0.08"
          data-screen-label="Intro"
        >
          <div className="beat-inner">
            <div className="panel hero-panel">
              <p className="eyebrow">
                <span className="ix">{content.hero_index}</span>
                <span className="bar" />
                <span>{content.hero_eyebrow}</span>
              </p>
              <h1 className="hero-name" ref={heroNameRef}>
                {nameLines.map((ln, i) => (
                  <span className="ln" key={i}>
                    {ln}
                  </span>
                ))}
              </h1>
              <p className="hero-lead">{content.hero_lead}</p>
              <div className="hero-meta">
                {content.hero_meta.map((m, i) => (
                  <React.Fragment key={i}>
                    {i > 0 && <i />}
                    <span>{m}</span>
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* I — the thesis */}
        <section
          className="beat interlude"
          data-side="left"
          data-start="0.12"
          data-end="0.20"
          data-screen-label="About"
        >
          <div className="beat-inner">
            <div className="panel lede-panel">
              <p className="eyebrow lede-k">
                <span className="ix">{content.about_index}</span>
                <span className="bar" />
                <span>{content.about_eyebrow}</span>
              </p>
              <h2 className="lede">{multiline(content.about_lede)}</h2>
              <span className="lede-rule" />
              <p className="lede-sub">{content.about_sub}</p>
            </div>
          </div>
        </section>

        {/* II — bio */}
        <section
          className="beat"
          data-side="left"
          data-pos="bottom"
          data-start="0.24"
          data-end="0.36"
          data-screen-label="Bio"
        >
          <div className="beat-inner">
            <div className="panel bio-panel">
              <span className="beat-figure" aria-hidden="true">
                {content.bio_index}
              </span>
              <p className="eyebrow">
                <span className="ix">{content.bio_index}</span>
                <span className="bar" />
                <span>{content.bio_eyebrow}</span>
              </p>
              <h2 className="beat-title beat-h">{content.bio_title}</h2>
              <div className="bio-prose">
                <p>{content.bio && content.bio.trim().length > 0 ? content.bio : 'More on me — coming soon.'}</p>
              </div>
            </div>
          </div>
        </section>

        {/* III — interests */}
        <section
          className="beat"
          data-side="left"
          data-pos="bottom"
          data-start="0.40"
          data-end="0.52"
          data-screen-label="Interests"
        >
          <div className="beat-inner">
            <div className="panel">
              <span className="beat-figure" aria-hidden="true">
                {content.interests_index}
              </span>
              <p className="eyebrow">
                <span className="ix">{content.interests_index}</span>
                <span className="bar" />
                <span>{content.interests_eyebrow}</span>
              </p>
              <h2 className="beat-title beat-h">{multiline(content.interests_title)}</h2>
              <ol className="threads">
                {content.interests.map((t, i) => (
                  <li className="thread" key={i}>
                    <span className="t-n">{String(i + 1).padStart(2, '0')}</span>
                    <span className="t-k">{t.title}</span>
                    <span className="t-d">{t.note}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        {/* IV — bloom invitation */}
        <section
          className="beat interlude"
          data-side="left"
          data-start="0.56"
          data-end="0.64"
          data-screen-label="Bloom"
        >
          <div className="beat-inner">
            <div className="panel lede-panel">
              <p className="eyebrow lede-k">
                <span className="ix">{content.bloom_index}</span>
                <span className="bar" />
                <span>{content.bloom_eyebrow}</span>
              </p>
              <h2 className="lede">{multiline(content.bloom_lede)}</h2>
              <span className="bloom-pulse" aria-hidden="true" />
              <p className="lede-sub">{content.bloom_sub}</p>
            </div>
          </div>
        </section>

        {/* V — selected work */}
        <section
          className="beat"
          data-side="left"
          data-pos="bottom"
          data-start="0.68"
          data-end="0.82"
          data-screen-label="Work"
        >
          <div className="beat-inner">
            <div className="panel work-panel">
              <span className="beat-figure" aria-hidden="true">
                {content.work_index}
              </span>
              <p className="eyebrow">
                <span className="ix">{content.work_index}</span>
                <span className="bar" />
                <span>{content.work_eyebrow}</span>
              </p>
              <h2 className="beat-title beat-h">{multiline(content.work_title)}</h2>
              <div className="work-list">
                {content.work.map((w, i) => (
                  <a
                    className="work-item"
                    key={i}
                    href={w.link}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <span className="work-yr">{w.year}</span>
                    <span className="work-body">
                      <span className="work-t">
                        {w.title} <span className="work-arrow">&#8599;</span>
                      </span>
                      <span className="work-meta">{w.meta}</span>
                      <span className="work-d">{w.description}</span>
                    </span>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* VI — finale */}
        <section
          className="beat finale"
          data-side="left"
          data-pos="bottom"
          data-start="0.88"
          data-end="0.99"
          data-screen-label="More"
        >
          <div className="beat-inner">
            <div className="panel">
              <span className="beat-figure" aria-hidden="true">
                {content.finale_index}
              </span>
              <p className="eyebrow">
                <span className="ix">{content.finale_index}</span>
                <span className="bar" />
                <span>{content.finale_eyebrow}</span>
              </p>
              <h2 className="beat-title beat-h">{content.finale_title}</h2>
              <p className="beat-sub">{content.finale_sub}</p>
              <Link className="cta" href="/projects">
                <span className="arrow">&#8627;</span>
                <span>{content.finale_cta}</span>
              </Link>
            </div>
          </div>
        </section>
      </div>

      {/* tall driver: the scene's scrollbar */}
      <div className="scroll-driver" ref={driverRef} />

      {/* FOOTER — real flow, reached at the end */}
      <footer className="site-footer" id="contact" data-screen-label="Footer">
        <div className="foot-inner">
          <div className="foot-grid">
            <div>
              <p className="eyebrow">
                <span className="ix">{content.footer_index}</span>
                <span className="bar" />
                <span>{content.footer_eyebrow}</span>
              </p>
              <h2 className="foot-title">{content.footer_title}</h2>
              <p className="foot-sub">{content.footer_sub}</p>
            </div>
            <div className="foot-col">
              <div>
                <span className="line-label">By email</span>
                <a className="link line-val" href={`mailto:${content.email}`}>
                  {content.email}
                </a>
              </div>
              <div>
                <span className="line-label">On Discord</span>
                <span className="line-val">{content.discord}</span>
              </div>
            </div>
            <div className="foot-col">
              <div>
                <span className="line-label">Elsewhere</span>
                <div className="socials">
                  <a
                    className="social"
                    href={content.github}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="GitHub"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
                    </svg>
                  </a>
                  <a
                    className="social"
                    href={content.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="LinkedIn"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.063 2.063 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                    </svg>
                  </a>
                  <a
                    className="social"
                    href={content.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Instagram"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919C8.416 2.175 8.796 2.163 12 2.163zm0-2.163C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                    </svg>
                  </a>
                </div>
              </div>
              <div>
                <span className="line-label">More</span>
                <Link className="link line-val" href="/projects">
                  {content.footer_projects}
                </Link>
              </div>
            </div>
          </div>
          <div className="foot-base">
            <span>{content.footer_copyright}</span>
            <a className="wordmark" href="#top">
              Back to top &uarr;
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
