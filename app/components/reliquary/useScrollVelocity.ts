'use client';

import { useEffect, useRef } from 'react';

/**
 * Scroll-energy singleton — one shared rAF loop across the whole app.
 *
 * Before: every hook consumer spun up its own perpetual rAF decay loop, so
 * three consumers = three idle rAF ticks per frame forever.
 *
 * Now: one module-level value, one rAF that only runs while energy > epsilon
 * and self-terminates when still. `getScrollEnergy()` is O(1) and free to
 * poll inside other animation loops.
 */

let energy = 0;
let lastY = 0;
let lastT = 0;
let rafId: number | null = null;
let initialized = false;

function decayTick() {
  energy *= 0.965;
  if (energy < 0.002) {
    energy = 0;
    rafId = null;
    return;
  }
  rafId = requestAnimationFrame(decayTick);
}

function init() {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;
  lastY = window.scrollY;
  lastT = performance.now();

  window.addEventListener(
    'scroll',
    () => {
      const now = performance.now();
      const dy = Math.abs(window.scrollY - lastY);
      const dt = Math.max(1, now - lastT);
      const vel = dy / dt;
      const norm = Math.min(1, vel / 3);
      energy = Math.max(energy, norm);
      lastY = window.scrollY;
      lastT = now;
      if (rafId === null) {
        rafId = requestAnimationFrame(decayTick);
      }
    },
    { passive: true }
  );
}

export function getScrollEnergy() {
  return energy;
}

/**
 * Back-compat hook returning a ref whose .current is refreshed every rAF.
 * Prefer getScrollEnergy() directly inside your own animation loops.
 */
export function useScrollVelocity() {
  const ref = useRef(0);
  useEffect(() => {
    init();
    let raf: number | null = null;
    const tick = () => {
      ref.current = energy;
      if (energy > 0) {
        raf = requestAnimationFrame(tick);
      } else {
        raf = null;
      }
    };
    // Piggyback on the singleton: poll only while energy is nonzero
    const onScroll = () => {
      if (raf === null) raf = requestAnimationFrame(tick);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (raf !== null) cancelAnimationFrame(raf);
    };
  }, []);
  return ref;
}
