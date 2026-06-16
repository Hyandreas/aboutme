'use client';

import React, { useEffect, useRef } from 'react';
import './overture.css';

/**
 * The entrance loading curtain — the same counter veil the homepage scene
 * shows while it loads. Counts 00→100 over ~1.5s, then lifts to reveal the
 * page. Used on /projects to cover its load behind something intentional.
 */
export default function Overture({ spec }: { spec: string }) {
  const veilRef = useRef<HTMLDivElement>(null);
  const countRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const veil = veilRef.current;
    if (!veil) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) {
      veil.classList.add('lift', 'gone');
      return;
    }

    const dur = 1500;
    const t0 = performance.now();
    const smoothstep = (t: number) => {
      t = Math.min(1, Math.max(0, t));
      return t * t * (3 - 2 * t);
    };

    const iv = setInterval(() => {
      const k = Math.min(1, (performance.now() - t0) / dur);
      if (countRef.current) {
        countRef.current.textContent = String(Math.round(smoothstep(k) * 100)).padStart(2, '0');
      }
      if (k >= 1) clearInterval(iv);
    }, 40);

    const liftTimer = setTimeout(() => veil.classList.add('lift'), dur + 200);
    const goneTimer = setTimeout(() => veil.classList.add('gone'), dur + 200 + 1300);

    return () => {
      clearInterval(iv);
      clearTimeout(liftTimer);
      clearTimeout(goneTimer);
    };
  }, []);

  return (
    <div className="ld-veil" ref={veilRef} aria-hidden="true">
      <div className="ld-stack">
        <span className="ld-spec">{spec}</span>
        <div className="ld-seed" />
        <span className="ld-count" ref={countRef}>
          00
        </span>
      </div>
    </div>
  );
}
