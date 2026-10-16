'use client';

import { useEffect, useRef } from 'react';
import { HYACINTH_SCROLL_VIEWPORTS } from './hyacinthScrollCamera';
import './hyacinth.css';

interface HyacinthApi {
  triggerBloom?: () => void;
  loadImage?: (url: string) => void;
  dispose?: () => void;
}

interface HyacinthModule {
  initHyacinth: (opts: {
    canvas: HTMLCanvasElement;
    getProgress: () => number;
    lookOffset?: number;
    transparentBackground?: boolean;
    scrollScene?: boolean;
  }) => HyacinthApi | null;
}

interface HyacinthBackdropProps {
  bloomButtonLabel: string;
  className?: string;
  lookOffset?: number;
  transparentBackground?: boolean;
  scrollScene?: boolean;
}

export default function HyacinthBackdrop({
  bloomButtonLabel,
  className = '',
  lookOffset,
  transparentBackground = false,
  scrollScene = false,
}: HyacinthBackdropProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<HyacinthApi | null>(null);

  useEffect(() => {
    let disposed = false;

    document.documentElement.classList.add('hy-page-active');
    document.body.classList.add('hy-active');
    if (scrollScene) document.documentElement.classList.add('hy-scroll-active');

    // Native wheel, touch and keyboard scrolling share the same camera progress.
    // Read only on scroll/resize; the WebGL loop does not need React state updates.
    let scrollProgress = 0;
    const scrollShell = canvasRef.current?.closest<HTMLElement>('.hy-scroll-scene');
    const main = scrollShell?.querySelector<HTMLElement>('.hy-screen-main');
    const copy = main?.firstElementChild;
    let copyObserver: ResizeObserver | undefined;
    const readScrollProgress = () => {
      const range = document.documentElement.scrollHeight - window.innerHeight;
      scrollProgress = range > 0 ? Math.min(1, Math.max(0, window.scrollY / range)) : 0;
    };
    const fitScrollContent = () => {
      scrollShell?.style.setProperty('--hy-scroll-length', `${window.innerHeight * (HYACINTH_SCROLL_VIEWPORTS + 1)}px`);
      if (main && copy && scrollShell) {
        const style = getComputedStyle(main);
        const requiredHeight = copy.getBoundingClientRect().height
          + parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
        scrollShell.classList.toggle('hy-scroll-content-overflow', requiredHeight > window.innerHeight);
      }
      readScrollProgress();
    };
    const resizeScrollContent = () => {
      const previousProgress = scrollProgress;
      fitScrollContent();
      const range = document.documentElement.scrollHeight - window.innerHeight;
      window.scrollTo(0, previousProgress * Math.max(0, range));
      readScrollProgress();
    };
    if (scrollScene) {
      fitScrollContent();
      window.addEventListener('scroll', readScrollProgress, { passive: true });
      window.addEventListener('resize', resizeScrollContent);
      if (copy && typeof ResizeObserver !== 'undefined') {
        copyObserver = new ResizeObserver(fitScrollContent);
        copyObserver.observe(copy);
      }
    }

    const onBloom = () => {
      const glow = glowRef.current;
      if (!glow) return;
      glow.classList.remove('fire');
      glow.getBoundingClientRect();
      glow.classList.add('fire');
    };

    document.addEventListener('hyacinth:bloom', onBloom);
    let fallbackProgress: number | null = null;
    const onUnavailable = () => {
      if (disposed) return;
      if (fallbackProgress === null) fallbackProgress = scrollProgress;
      scrollShell?.classList.add('hy-scroll-unavailable');
      // Keep native overflow available for short screens even without WebGL.
      fitScrollContent();
    };
    const onAvailable = () => {
      if (disposed || fallbackProgress === null) return;
      scrollShell?.classList.remove('hy-scroll-unavailable');
      fitScrollContent();
      const range = document.documentElement.scrollHeight - window.innerHeight;
      window.scrollTo(0, fallbackProgress * Math.max(0, range));
      fallbackProgress = null;
      readScrollProgress();
    };
    document.addEventListener('hyacinth:unavailable', onUnavailable);
    document.addEventListener('hyacinth:available', onAvailable);

    (async () => {
      const mod = (await import('./hyacinth3d')) as HyacinthModule;
      if (disposed) return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      const api = mod.initHyacinth({
        canvas,
        getProgress: () => scrollProgress,
        lookOffset,
        transparentBackground,
        scrollScene,
      });

      if (disposed) {
        api?.dispose?.();
        return;
      }

      apiRef.current = api;
      if (!api && scrollScene) {
        onUnavailable();
      }
      api?.loadImage?.('/assets/hyacinth.png');
    })().catch(onUnavailable);

    return () => {
      disposed = true;
      document.removeEventListener('hyacinth:bloom', onBloom);
      document.removeEventListener('hyacinth:unavailable', onUnavailable);
      document.removeEventListener('hyacinth:available', onAvailable);
      window.removeEventListener('scroll', readScrollProgress);
      window.removeEventListener('resize', resizeScrollContent);
      copyObserver?.disconnect();
      scrollShell?.classList.remove('hy-scroll-content-overflow');
      scrollShell?.classList.remove('hy-scroll-unavailable');
      scrollShell?.style.removeProperty('--hy-scroll-length');
      scrollShell?.style.removeProperty('--hy-world-reveal');
      apiRef.current?.dispose?.();
      apiRef.current = null;
      document.body.classList.remove('hy-active');
      document.documentElement.classList.remove('hy-page-active');
      if (scrollScene) document.documentElement.classList.remove('hy-scroll-active');
    };
  }, [lookOffset, transparentBackground, scrollScene]);

  return (
    <div className={['hy hy-still', className].filter(Boolean).join(' ')} aria-hidden="true">
      <canvas id="vault-gl" ref={canvasRef} />
      <div className="votive-fallback" />
      <div className="vignette" />
      <div className="grain" />
      <button
        className="still-bloom-hit"
        type="button"
        tabIndex={-1}
        aria-label={bloomButtonLabel}
        onClick={() => apiRef.current?.triggerBloom?.()}
      />
      <div className="bloom-glow" ref={glowRef} />
    </div>
  );
}
