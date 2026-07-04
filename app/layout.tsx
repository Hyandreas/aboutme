import type { Metadata } from 'next'
import React from 'react'
import './globals.css'
import './components/coldopen/coldOpen.css'
import LockdownOverlay from './components/LockdownOverlay'
import ColdOpen from './components/coldopen/ColdOpen'
import { COLD_OPEN_SEEN_KEY } from './components/coldopen/coldOpenState'
import SpotifyEmbedPreloader from './components/SpotifyEmbedPreloader'
import { getConfig, getSiteChrome, getSongsContent } from '@/lib/content'

const COLD_OPEN_BOOT_EXIT_WATCHDOG_MS = 18000
const COLD_OPEN_BOOT_LOAD_GATE_SETTLE_MS = 620
const COLD_OPEN_BOOT_MIN_LOAD_SCREEN_MS = 8600

function coldOpenBootScript(lockdown: boolean, disabledPages: Array<{ path: string }>) {
  return `
(function () {
  try {
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var disabledPages = ${JSON.stringify(disabledPages.map((page) => page.path))};
    var path = window.location && window.location.pathname ? window.location.pathname : '/';
    if (path.length > 1) path = path.replace(/\\/+$/, '');
    var disabled = ${JSON.stringify(lockdown)} || disabledPages.indexOf(path) > -1;
    var seen = false;
    try {
      seen = !!(window.sessionStorage && window.sessionStorage.getItem(${JSON.stringify(COLD_OPEN_SEEN_KEY)}));
    } catch (storageError) {
      seen = true;
    }
    var shouldPlay = !disabled && !reduce && !seen;
    document.documentElement.classList.add(shouldPlay ? 'intro2-playing' : 'intro2-skip');
    if (!shouldPlay) return;

    var bootTimers = [];
    var clearBootTimers = function () {
      while (bootTimers.length) window.clearTimeout(bootTimers.pop());
    };
    var scheduleBoot = function (fn, delay) {
      var id = window.setTimeout(fn, delay);
      bootTimers.push(id);
      return id;
    };
    var hasHydratedReel = function (root) {
      return !!window.__hyIntro2 && root && !root.classList.contains('crt2-preboot');
    };
    var canDrivePreboot = function (root) {
      var intro = window.__hyIntro2;
      return !!root && root.classList.contains('crt2-preboot') && !(intro && intro.done);
    };
    var showOnly = function (root, id) {
      if (!root) return;
      root.setAttribute('data-boot-stage', id);
      var frames = root.querySelectorAll('.crt2-frame');
      for (var i = 0; i < frames.length; i += 1) {
        frames[i].classList.toggle('on', frames[i].getAttribute('data-f') === id);
      }
    };
    var flashCut = function (root) {
      var cut = root && root.querySelector('.crt2-cut');
      if (!cut) return;
      cut.classList.remove('flash');
      void cut.offsetWidth;
      cut.classList.add('flash');
    };
    var fillLoad = function (root, value) {
      var num = root && root.querySelector('.load2-num');
      var fill = root && root.querySelector('.load2-fill');
      if (num) num.textContent = String(value);
      if (fill) fill.style.width = value + '%';
    };
    var revealStart = function (root) {
      var intro = window.__hyIntro2;
      if (!root || (intro && intro.done)) return;

      if (root.querySelector('.f2-static.on')) {
        flashCut(root);
        showOnly(root, 'spell');
        fillLoad(root, 100);
      }

      root.classList.add('ready-to-play');
      var start = root.querySelector('.crt2-start');
      if (!start || start.getAttribute('data-boot-fallback-bound') === 'true') return;

      var finishFromClick = function (event) {
        if (event && event.preventDefault) event.preventDefault();
        finish();
      };

      start.setAttribute('data-boot-fallback-bound', 'true');
      start.addEventListener('click', finishFromClick, { once: true });
    };
    var runPrebootReel = function (root) {
      if (!canDrivePreboot(root) || root.getAttribute('data-boot-reel') === 'running') return;
      root.setAttribute('data-boot-reel', 'running');

      scheduleBoot(function () {
        if (hasHydratedReel(root) || !canDrivePreboot(root)) return;
        showOnly(root, 'static');
      }, 0);

      scheduleBoot(function () {
        if (hasHydratedReel(root) || !canDrivePreboot(root)) return;
        flashCut(root);
        showOnly(root, 'bars');
      }, 940);

      scheduleBoot(function () {
        if (hasHydratedReel(root) || !canDrivePreboot(root)) return;
        flashCut(root);
        showOnly(root, 'spell');

        var spell = root.querySelector('.f2-spell');
        var palette = ['c-green', 'c-blue', 'c-pink'];
        var value = 0;
        var loadStartedAt = window.performance && window.performance.now ? window.performance.now() : Date.now();
        var tick = function () {
          if (hasHydratedReel(root) || !canDrivePreboot(root)) return;
          value = Math.min(100, value + 4 + Math.floor(Math.random() * 9));
          fillLoad(root, value);
          if (spell) {
            spell.classList.remove('c-green', 'c-blue', 'c-pink');
            spell.classList.add(palette[Math.floor(Math.random() * palette.length)]);
          }
          if (value >= 100) {
            var now = window.performance && window.performance.now ? window.performance.now() : Date.now();
            var elapsed = now - loadStartedAt;
            var delay = Math.max(
              ${JSON.stringify(COLD_OPEN_BOOT_LOAD_GATE_SETTLE_MS)},
              ${JSON.stringify(COLD_OPEN_BOOT_MIN_LOAD_SCREEN_MS)} - elapsed
            );
            scheduleBoot(function () {
              if (!hasHydratedReel(root) && canDrivePreboot(root)) revealStart(root);
            }, delay);
            return;
          }
          scheduleBoot(tick, Math.random() < 0.18 ? 240 + Math.random() * 300 : 70 + Math.random() * 110);
        };
        tick();
      }, 2260);
    };
    var waitForPrebootRoot = function () {
      var root = document.getElementById('crt2-root');
      if (root) {
        runPrebootReel(root);
        return;
      }
      scheduleBoot(waitForPrebootRoot, 16);
    };

    var finish = function () {
      var root = document.getElementById('crt2-root');
      clearBootTimers();
      try {
        if (window.sessionStorage) window.sessionStorage.setItem(${JSON.stringify(COLD_OPEN_SEEN_KEY)}, '1');
      } catch (error) {}
      if (window.__hyIntro2) window.__hyIntro2.done = true;
      document.documentElement.classList.remove('intro2-playing');
      document.documentElement.classList.add('intro2-skip');
      if (root) {
        root.className = 'crt2 crt2-gone';
        root.setAttribute('aria-hidden', 'true');
        root.innerHTML = '';
      }
      try {
        document.dispatchEvent(new CustomEvent('hy:intro2-done'));
      } catch (error) {}
    };

    waitForPrebootRoot();

    window.setTimeout(function () {
      try {
        var intro = window.__hyIntro2;
        if (intro && intro.done) return;
        finish();
      } catch (error) {}
    }, ${JSON.stringify(COLD_OPEN_BOOT_EXIT_WATCHDOG_MS)});
  } catch (error) {
    document.documentElement.classList.add('intro2-skip');
  }
})();
`
}

export function generateMetadata(): Metadata {
  const { metadata } = getSiteChrome()
  return {
    title: metadata.title,
    description: metadata.description,
    keywords: metadata.keywords,
    authors: [{ name: metadata.author }],
    openGraph: {
      title: metadata.og_title,
      description: metadata.og_description,
      type: 'website',
    },
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const {
    lockdown,
    lockdown_kicker,
    lockdown_title,
    lockdown_message,
    disabled_pages,
  } = getConfig()
  const { cold_open } = getSiteChrome()
  const spotifyEmbedUrls = getSongsContent().tracks.map((track) => track.src)

  return (
    <html lang="en" className="scroll-smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="preconnect" href="https://open.spotify.com" />
        <link rel="preconnect" href="https://embed-cdn.spotifycdn.com" />
        {/* All Google Fonts — site faces (Crimson Text / Cinzel / Special Elite)
            and the cold-open reel faces (Press Start 2P / VT323) —
            loaded via <link>, NOT @import. This project's webpack CSS pipeline
            does not keep an @import ahead of other rules, so the browser silently
            dropped it (verified: the @import landed ~170 rules deep in the
            bundle). A root-layout <link> is honored regardless of CSS order and
            applies to every route. The no-page-custom-font lint rule targets
            pages/_document misuse and is a false positive for the app router. */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Crimson+Text:ital,wght@0,400;0,600;1,400&family=Cinzel:wght@400;500;600&family=Special+Elite&family=Press+Start+2P&family=VT323&display=swap" />
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script dangerouslySetInnerHTML={{ __html: coldOpenBootScript(lockdown, disabled_pages) }} />
      </head>
      <body className="antialiased">
        <ColdOpen content={cold_open} lockdown={lockdown} disabledPages={disabled_pages} />
        {lockdown ? (
          <LockdownOverlay
            kicker={lockdown_kicker}
            title={lockdown_title}
            message={lockdown_message}
          />
        ) : (
          <>
            <SpotifyEmbedPreloader urls={spotifyEmbedUrls} />
            {children}
          </>
        )}
        <div id="scroll-top" />
      </body>
    </html>
  )
}
