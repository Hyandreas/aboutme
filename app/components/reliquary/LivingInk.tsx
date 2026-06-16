'use client';

import React, { useEffect, useRef } from 'react';

/**
 * LivingInk — curl-noise flow field of ink particles.
 *
 * Perf notes:
 *  - Pre-baked sprite canvases (one per color). Zero runtime gradient
 *    creation. drawImage is cheap.
 *  - 120 particles desktop, disabled on mobile & reduced-motion
 *  - Paused on document.hidden
 *  - devicePixelRatio capped at 1.5 (tradeoff: softer vs FPS)
 *  - globalAlpha + single drawImage per particle (vs radial-gradient-per-frame)
 */

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  kind: 0 | 1 | 2; // 0 indigo, 1 amethyst, 2 bone
  size: number;
}

const PARTICLE_COLORS = [
  [79, 70, 229],    // indigo-votive
  [124, 58, 237],   // amethyst-ember
  [232, 228, 216],  // bone
] as const;

// Pre-bake a soft radial sprite for a given RGB
function makeSprite(r: number, g: number, b: number, size = 64) {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');
  if (!ctx) return c;
  const cx = size / 2;
  const cy = size / 2;
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, cx);
  grad.addColorStop(0, `rgba(${r},${g},${b},1)`);
  grad.addColorStop(0.5, `rgba(${r},${g},${b},0.35)`);
  grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  return c;
}

function hash2(x: number, y: number) {
  const s = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return (s - Math.floor(s)) * 2 - 1;
}

function noise(x: number, y: number) {
  return (
    (Math.sin(x * 1.3 + y * 0.7) +
      Math.cos(x * 0.6 - y * 1.1) +
      Math.sin((x + y) * 0.4)) *
    0.333
  );
}

function flowAt(x: number, y: number, t: number) {
  const e = 0.08;
  const nx1 = noise(x + e, y + t * 0.12);
  const nx2 = noise(x - e, y + t * 0.12);
  const ny1 = noise(x, y + e + t * 0.12);
  const ny2 = noise(x, y - e + t * 0.12);
  return { fx: (ny1 - ny2) / (2 * e), fy: -(nx1 - nx2) / (2 * e) };
}

export default function LivingInk() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cursorRef = useRef({ x: -9999, y: -9999, active: false });
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (window.matchMedia('(max-width: 768px)').matches) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let dpr = Math.min(window.devicePixelRatio || 1, 1.5);

    const sprites = PARTICLE_COLORS.map(([r, g, b]) => makeSprite(r, g, b, 64));

    const COUNT = 120;
    const particles: Particle[] = [];

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

    const spawn = (p?: Particle): Particle => {
      const roll = Math.random();
      const kind: 0 | 1 | 2 = roll < 0.68 ? 0 : roll < 0.94 ? 1 : 2;
      const maxLife = 220 + Math.random() * 260;
      const x = Math.random() * width;
      const y = Math.random() * height;
      const base = p ?? ({} as Particle);
      base.x = x;
      base.y = y;
      base.vx = hash2(x, y) * 0.1;
      base.vy = hash2(y, x) * 0.1;
      base.life = 0;
      base.maxLife = maxLife;
      base.kind = kind;
      base.size = kind === 2 ? 2.2 + Math.random() * 1.6 : 3 + Math.random() * 3.5;
      return base;
    };

    for (let i = 0; i < COUNT; i++) particles.push(spawn());

    const onMove = (e: MouseEvent) => {
      cursorRef.current.x = e.clientX;
      cursorRef.current.y = e.clientY;
      cursorRef.current.active = true;
    };
    const onLeave = () => {
      cursorRef.current.active = false;
    };

    let t = 0;
    let hidden = document.hidden;
    const onVis = () => {
      hidden = document.hidden;
      if (!hidden && rafRef.current === null) {
        rafRef.current = requestAnimationFrame(draw);
      }
    };

    const draw = () => {
      if (hidden) {
        rafRef.current = null;
        return;
      }
      rafRef.current = requestAnimationFrame(draw);

      t += 0.01;

      // Trail clear
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
      ctx.fillStyle = 'rgba(5, 3, 9, 0.09)';
      ctx.fillRect(0, 0, width, height);

      ctx.globalCompositeOperation = 'lighter';

      const cx = cursorRef.current.x;
      const cy = cursorRef.current.y;
      const cursorActive = cursorRef.current.active;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        const { fx, fy } = flowAt(p.x * 0.003, p.y * 0.003, t);
        p.vx += fx * 0.18;
        p.vy += fy * 0.18;

        if (cursorActive) {
          const dx = p.x - cx;
          const dy = p.y - cy;
          const dist2 = dx * dx + dy * dy;
          const R = 160;
          if (dist2 < R * R && dist2 > 0.01) {
            const dist = Math.sqrt(dist2);
            const force = (1 - dist / R) * 2.2;
            p.vx += (dx / dist) * force;
            p.vy += (dy / dist) * force;
          }
        }

        p.vx *= 0.94;
        p.vy *= 0.94;
        p.x += p.vx;
        p.y += p.vy;
        p.life += 1;

        if (
          p.life >= p.maxLife ||
          p.x < -20 ||
          p.x > width + 20 ||
          p.y < -20 ||
          p.y > height + 20
        ) {
          spawn(p);
          continue;
        }

        const lifeFrac = p.life / p.maxLife;
        const fade =
          lifeFrac < 0.15
            ? lifeFrac / 0.15
            : lifeFrac > 0.8
              ? (1 - lifeFrac) / 0.2
              : 1;

        const alpha = fade * (p.kind === 2 ? 0.55 : 0.28);
        const sprite = sprites[p.kind];
        const s = p.size * 6;

        ctx.globalAlpha = alpha;
        ctx.drawImage(sprite, p.x - s / 2, p.y - s / 2, s, s);
      }
      ctx.globalAlpha = 1;
    };

    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', onMove, { passive: true });
    window.addEventListener('mouseout', onLeave);
    document.addEventListener('visibilitychange', onVis);

    rafRef.current = requestAnimationFrame(draw);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseout', onLeave);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0"
      style={{
        zIndex: 0,
        mixBlendMode: 'screen',
        opacity: 0.9,
      }}
    />
  );
}
