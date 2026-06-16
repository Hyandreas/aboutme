'use client';

import React, { useEffect, useRef } from 'react';
import { getScrollEnergy } from './useScrollVelocity';

/**
 * LiveGrain — static overlay that breathes with scroll velocity.
 * Listens to scroll events directly (piggybacking the singleton). Only
 * mutates opacity when the change is ≥1% — sub-threshold wiggles don't
 * paint unnecessarily.
 */
export default function LiveGrain() {
  const ref = useRef<HTMLDivElement>(null);
  const lastOpacity = useRef(0.05);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf: number | null = null;

    const apply = () => {
      const target = 0.05 + getScrollEnergy() * 0.06;
      if (Math.abs(target - lastOpacity.current) > 0.003) {
        el.style.opacity = String(target);
        lastOpacity.current = target;
      }
      if (getScrollEnergy() > 0.002) {
        raf = requestAnimationFrame(apply);
      } else {
        raf = null;
      }
    };

    const onScroll = () => {
      if (raf === null) raf = requestAnimationFrame(apply);
    };
    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', onScroll);
      if (raf !== null) cancelAnimationFrame(raf);
    };
  }, []);

  return <div ref={ref} className="reliquary-grain" aria-hidden="true" />;
}
