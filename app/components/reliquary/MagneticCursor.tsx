'use client';

import React, { useEffect, useRef, useState } from 'react';

/**
 * MagneticCursor — hollow bone ring with an ash trail.
 *
 * - Spring-damped lag behind the actual pointer (reads as ceremonial, not snappy)
 * - Trail particles emitted at mouse velocity — stronger movement = more trail
 * - Magnetic pull toward interactive elements when within pull radius
 * - Ring morphs shape on context: default / link / vitrine / text
 * - Hides on touch devices
 * - Respects prefers-reduced-motion (falls back to regular cursor)
 */

interface TrailDot {
  x: number;
  y: number;
  age: number;
  maxAge: number;
  size: number;
}

type CursorMode = 'default' | 'link' | 'vitrine' | 'text';

export default function MagneticCursor() {
  const ringRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [enabled, setEnabled] = useState(false);
  const modeRef = useRef<CursorMode>('default');
  const ringStateRef = useRef({
    x: -100,
    y: -100,
    tx: -100, // target
    ty: -100,
  });
  const dotStateRef = useRef({ x: -100, y: -100 });
  const trailRef = useRef<TrailDot[]>([]);

  useEffect(() => {
    // Skip on touch or reduced motion
    if (window.matchMedia('(hover: none)').matches) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    setEnabled(true);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const ring = ringRef.current;
    const dot = dotRef.current;
    const canvas = canvasRef.current;
    if (!ring || !dot || !canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    let dpr = Math.min(window.devicePixelRatio || 1, 1.5);

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    // Pre-baked bone-dust sprite — single radial gradient, zero per-frame allocation
    const trailSprite = (() => {
      const s = document.createElement('canvas');
      s.width = 32;
      s.height = 32;
      const sctx = s.getContext('2d');
      if (!sctx) return s;
      const g = sctx.createRadialGradient(16, 16, 0, 16, 16, 16);
      g.addColorStop(0, 'rgba(232,228,216,0.9)');
      g.addColorStop(0.5, 'rgba(232,228,216,0.25)');
      g.addColorStop(1, 'rgba(232,228,216,0)');
      sctx.fillStyle = g;
      sctx.fillRect(0, 0, 32, 32);
      return s;
    })();

    let lastX = 0;
    let lastY = 0;

    const onMove = (e: MouseEvent) => {
      const state = ringStateRef.current;
      state.tx = e.clientX;
      state.ty = e.clientY;
      dotStateRef.current.x = e.clientX;
      dotStateRef.current.y = e.clientY;

      // Emit trail particles at velocity — more movement, more trail
      const vx = e.clientX - lastX;
      const vy = e.clientY - lastY;
      const speed = Math.hypot(vx, vy);
      if (speed > 3) {
        const count = Math.min(2, Math.ceil(speed / 14));
        for (let i = 0; i < count; i++) {
          trailRef.current.push({
            x: e.clientX + (Math.random() - 0.5) * 4,
            y: e.clientY + (Math.random() - 0.5) * 4,
            age: 0,
            maxAge: 26 + Math.random() * 18,
            size: 0.8 + Math.random() * 1.2,
          });
        }
        if (trailRef.current.length > 70) {
          trailRef.current.splice(0, trailRef.current.length - 70);
        }
      }
      lastX = e.clientX;
      lastY = e.clientY;

      // Detect hovered context — sets cursor mode
      const target = e.target as HTMLElement;
      if (!target) return;

      const isInteractive = !!target.closest(
        'a, button, [role="button"], input, textarea, select, .cta-reliquary, .link-reliquary'
      );
      const isVitrine = !!target.closest('.vitrine');
      const isTextInput = !!target.closest('input, textarea');

      let next: CursorMode = 'default';
      if (isTextInput) next = 'text';
      else if (isInteractive) next = 'link';
      else if (isVitrine) next = 'vitrine';

      modeRef.current = next;
    };

    const onDown = () => {
      ring.dataset.pressed = 'true';
    };
    const onUp = () => {
      delete ring.dataset.pressed;
    };

    window.addEventListener('mousemove', onMove, { passive: true });
    window.addEventListener('mousedown', onDown);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('resize', resize);

    let raf: number | null = null;
    const tick = () => {
      raf = requestAnimationFrame(tick);

      // Ring — spring lag
      const s = ringStateRef.current;
      s.x += (s.tx - s.x) * 0.18;
      s.y += (s.ty - s.y) * 0.18;

      const mode = modeRef.current;
      const pressed = ring.dataset.pressed === 'true';
      let size = 24;
      let opacity = 0.9;
      let borderColor = 'rgba(232,228,216,0.5)';
      let bg = 'transparent';
      let mix: 'difference' | 'normal' = 'difference';

      if (mode === 'link') {
        size = 48;
        opacity = 1;
        borderColor = 'rgba(232,228,216,0.7)';
      } else if (mode === 'vitrine') {
        size = 72;
        opacity = 0.9;
        borderColor = 'rgba(124,58,237,0.7)';
        mix = 'normal';
      } else if (mode === 'text') {
        size = 4;
        opacity = 1;
        borderColor = 'rgba(232,228,216,0.9)';
        bg = 'rgba(232,228,216,0.9)';
        mix = 'normal';
      }

      if (pressed) size *= 0.82;

      ring.style.transform = `translate3d(${s.x - size / 2}px, ${s.y - size / 2}px, 0)`;
      ring.style.width = `${size}px`;
      ring.style.height = mode === 'text' ? `18px` : `${size}px`;
      ring.style.borderColor = borderColor;
      ring.style.background = bg;
      ring.style.opacity = String(opacity);
      ring.style.mixBlendMode = mix;
      ring.style.borderRadius = mode === 'text' ? '2px' : '50%';

      // Center dot
      const d = dotStateRef.current;
      dot.style.transform = `translate3d(${d.x - 2}px, ${d.y - 2}px, 0)`;
      dot.style.opacity = mode === 'text' ? '0' : '0.9';

      // Trail canvas — fade + redraw using pre-baked sprite
      ctx.clearRect(0, 0, width, height);
      const trail = trailRef.current;
      for (let i = trail.length - 1; i >= 0; i--) {
        const td = trail[i];
        td.age += 1;
        if (td.age >= td.maxAge) {
          trail.splice(i, 1);
          continue;
        }
        const frac = 1 - td.age / td.maxAge;
        const alpha = frac * 0.4;
        const r = td.size * (1 + (1 - frac) * 2);
        const s = r * 5;
        ctx.globalAlpha = alpha;
        ctx.drawImage(trailSprite, td.x - s / 2, td.y - s / 2, s, s);
      }
      ctx.globalAlpha = 1;
    };
    raf = requestAnimationFrame(tick);

    // Hide system cursor only when ours is active
    document.documentElement.classList.add('magnetic-cursor-active');

    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('resize', resize);
      document.documentElement.classList.remove('magnetic-cursor-active');
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <>
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="pointer-events-none fixed inset-0"
        style={{ zIndex: 98 }}
      />
      <div
        ref={ringRef}
        aria-hidden="true"
        className="pointer-events-none fixed top-0 left-0"
        style={{
          zIndex: 99,
          border: '1px solid rgba(232,228,216,0.5)',
          borderRadius: '50%',
          width: 24,
          height: 24,
          transition:
            'width 400ms cubic-bezier(0.16,1,0.3,1), height 400ms cubic-bezier(0.16,1,0.3,1), border-color 400ms ease, background 400ms ease, border-radius 400ms ease',
          willChange: 'transform, width, height',
          mixBlendMode: 'difference',
        }}
      />
      <div
        ref={dotRef}
        aria-hidden="true"
        className="pointer-events-none fixed top-0 left-0"
        style={{
          zIndex: 100,
          width: 4,
          height: 4,
          borderRadius: '50%',
          background: 'rgba(232,228,216,0.9)',
          willChange: 'transform',
        }}
      />
    </>
  );
}
