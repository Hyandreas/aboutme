'use client';

import { useEffect, useRef } from 'react';
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
  }) => HyacinthApi | null;
}

interface HyacinthBackdropProps {
  bloomButtonLabel: string;
  className?: string;
  lookOffset?: number;
  transparentBackground?: boolean;
}

export default function HyacinthBackdrop({
  bloomButtonLabel,
  className = '',
  lookOffset,
  transparentBackground = false,
}: HyacinthBackdropProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<HyacinthApi | null>(null);

  useEffect(() => {
    let disposed = false;

    document.documentElement.classList.add('hy-page-active');
    document.body.classList.add('hy-active');

    const onBloom = () => {
      const glow = glowRef.current;
      if (!glow) return;
      glow.classList.remove('fire');
      glow.getBoundingClientRect();
      glow.classList.add('fire');
    };

    document.addEventListener('hyacinth:bloom', onBloom);

    (async () => {
      const mod = (await import('./hyacinth3d')) as HyacinthModule;
      if (disposed) return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      const api = mod.initHyacinth({
        canvas,
        getProgress: () => 0,
        lookOffset,
        transparentBackground,
      });

      if (disposed) {
        api?.dispose?.();
        return;
      }

      apiRef.current = api;
      api?.loadImage?.('/assets/hyacinth.png');
    })();

    return () => {
      disposed = true;
      document.removeEventListener('hyacinth:bloom', onBloom);
      apiRef.current?.dispose?.();
      apiRef.current = null;
      document.body.classList.remove('hy-active');
      document.documentElement.classList.remove('hy-page-active');
    };
  }, [lookOffset, transparentBackground]);

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
