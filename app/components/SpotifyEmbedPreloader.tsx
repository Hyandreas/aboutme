'use client';

import { useEffect } from 'react';

const PRELOAD_ROOT_ID = 'spotify-embed-preload-root';
const SONGS_EMBEDS_VISIBLE_EVENT = 'hy:songs-embeds-visible';
const SONGS_PATH = '/songs';
const PRELOAD_START_DELAY_MS = 700;
const PRELOAD_STAGGER_MS = 550;
const RELEASE_DELAY_MS = 1800;

interface SpotifyEmbedPreloaderProps {
  urls: string[];
}

function getSpotifyEmbedUrls(urls: string[]): string[] {
  const seen = new Set<string>();

  return urls.reduce<string[]>((acc, rawUrl) => {
    const url = rawUrl.trim();
    if (!url || seen.has(url)) return acc;

    try {
      const parsed = new URL(url);
      const isSpotifyEmbed =
        parsed.protocol === 'https:' &&
        parsed.hostname === 'open.spotify.com' &&
        parsed.pathname.startsWith('/embed/');

      if (!isSpotifyEmbed) return acc;
    } catch {
      return acc;
    }

    seen.add(url);
    acc.push(url);
    return acc;
  }, []);
}

function createPreloadRoot(): HTMLDivElement {
  const existing = document.getElementById(PRELOAD_ROOT_ID);
  if (existing instanceof HTMLDivElement) return existing;

  const root = document.createElement('div');
  root.id = PRELOAD_ROOT_ID;
  root.setAttribute('aria-hidden', 'true');
  root.style.position = 'fixed';
  root.style.right = '0';
  root.style.bottom = '0';
  root.style.width = '1px';
  root.style.height = '1px';
  root.style.overflow = 'hidden';
  root.style.opacity = '0.001';
  root.style.pointerEvents = 'none';
  root.style.zIndex = '-1';
  document.body.appendChild(root);

  return root;
}

function appendSpotifyPreloadFrame(root: HTMLElement, src: string, index: number): void {
  if (root.querySelector(`iframe[data-spotify-preload-index="${index}"]`)) return;

  const frame = document.createElement('iframe');
  frame.dataset.spotifyPreloadIndex = String(index);
  frame.title = `Spotify embed preload ${index + 1}`;
  frame.src = src;
  frame.loading = 'eager';
  frame.width = '300';
  frame.height = '152';
  frame.tabIndex = -1;
  frame.setAttribute('allow', 'autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture');
  root.appendChild(frame);
}

function isSongsPath(pathname: string): boolean {
  return pathname === SONGS_PATH || pathname === `${SONGS_PATH}/`;
}

export default function SpotifyEmbedPreloader({ urls }: SpotifyEmbedPreloaderProps) {
  const urlsKey = urls.join('\n');

  useEffect(() => {
    const spotifyUrls = getSpotifyEmbedUrls(urlsKey.split('\n'));
    const shouldPreloadWithFrames =
      spotifyUrls.length > 0 &&
      !isSongsPath(window.location.pathname) &&
      document.documentElement.classList.contains('intro2-playing');

    if (!shouldPreloadWithFrames) return undefined;

    const timers: number[] = [];
    let root: HTMLDivElement | null = null;
    let released = false;

    const release = (delay = RELEASE_DELAY_MS) => {
      if (released) return;
      released = true;
      timers.push(window.setTimeout(() => {
        root?.remove();
        root = null;
      }, delay));
    };

    timers.push(window.setTimeout(() => {
      root = createPreloadRoot();

      spotifyUrls.forEach((src, index) => {
        timers.push(window.setTimeout(() => {
          if (!root || released) return;
          appendSpotifyPreloadFrame(root, src, index);
        }, index * PRELOAD_STAGGER_MS));
      });
    }, PRELOAD_START_DELAY_MS));

    const releaseForSongsPage = () => release();
    const releaseForPageHide = () => release(0);

    document.addEventListener(SONGS_EMBEDS_VISIBLE_EVENT, releaseForSongsPage);
    window.addEventListener('pagehide', releaseForPageHide, { once: true });

    return () => {
      document.removeEventListener(SONGS_EMBEDS_VISIBLE_EVENT, releaseForSongsPage);
      window.removeEventListener('pagehide', releaseForPageHide);
      timers.forEach((timer) => window.clearTimeout(timer));
      root?.remove();
    };
  }, [urlsKey]);

  return null;
}
