'use client';

import React, { useEffect, useRef } from 'react';

/**
 * MarionetteStrings — Verlet rope simulation.
 *
 * Five strings descend from off-canvas top to body anchor points on the
 * marionette silhouette. Each string is a chain of mass-points connected by
 * distance constraints. Gravity + wind + cursor influence perturb the ropes;
 * constraint solver iterates ~4 passes per frame to keep the ropes taut.
 *
 * Anchors are expressed as fractions of the marionette bbox, so the strings
 * scale cleanly regardless of viewport.
 */

interface Point {
  x: number;
  y: number;
  ox: number; // old x — Verlet needs last position
  oy: number;
  pinned: boolean;
}

interface Rope {
  points: Point[];
  segLen: number;
  anchorFrac: { x: number; y: number }; // anchor on marionette
  topX: number; // where it descends from (viewport px)
}

interface Props {
  /** Fraction of viewport width for the marionette center */
  marionCenterXFrac: number;
  /** Fraction of viewport height for the marionette center */
  marionCenterYFrac: number;
  /** Marionette bbox width in px */
  marionWidth: number;
  /** Marionette bbox height in px */
  marionHeight: number;
}

const ANCHORS = [
  { x: 0.22, y: 0.14 }, // left shoulder-ish
  { x: 0.50, y: 0.08 }, // crown
  { x: 0.78, y: 0.14 }, // right shoulder-ish
  { x: 0.30, y: 0.50 }, // left wrist
  { x: 0.70, y: 0.50 }, // right wrist
];

const SEGMENTS = 12;
const SOLVER_PASSES = 3;

export default function MarionetteStrings({
  marionCenterXFrac,
  marionCenterYFrac,
  marionWidth,
  marionHeight,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const pathRefs = useRef<(SVGPathElement | null)[]>([]);
  const ropesRef = useRef<Rope[]>([]);
  const cursorRef = useRef({ x: -9999, y: -9999, active: false });
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (window.matchMedia('(max-width: 768px)').matches) return;

    const initRopes = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const marionCX = marionCenterXFrac * vw;
      const marionCY = marionCenterYFrac * vh;
      const mw = marionWidth;
      const mh = marionHeight;

      const ropes: Rope[] = ANCHORS.map((a) => {
        // Anchor world position (relative to marionette bbox)
        const ax = marionCX + (a.x - 0.5) * mw;
        const ay = marionCY + (a.y - 0.5) * mh;
        // String descends from above the viewport, slightly offset
        const topX = ax + (a.x - 0.5) * 60;
        const topY = -120;
        const segLen = Math.hypot(ax - topX, ay - topY) / SEGMENTS;

        const points: Point[] = [];
        for (let i = 0; i <= SEGMENTS; i++) {
          const t = i / SEGMENTS;
          const x = topX + (ax - topX) * t;
          const y = topY + (ay - topY) * t;
          points.push({
            x,
            y,
            ox: x,
            oy: y,
            pinned: i === 0 || i === SEGMENTS,
          });
        }
        return { points, segLen, anchorFrac: a, topX };
      });
      ropesRef.current = ropes;
    };

    initRopes();
    window.addEventListener('resize', initRopes);

    const onMove = (e: MouseEvent) => {
      cursorRef.current.x = e.clientX;
      cursorRef.current.y = e.clientY;
      cursorRef.current.active = true;
    };
    window.addEventListener('mousemove', onMove, { passive: true });

    let wind = 0;
    let hidden = document.hidden;
    const onVis = () => {
      hidden = document.hidden;
      if (!hidden && rafRef.current === null) {
        rafRef.current = requestAnimationFrame(simulate);
      }
    };
    document.addEventListener('visibilitychange', onVis);

    const simulate = () => {
      if (hidden) {
        rafRef.current = null;
        return;
      }
      rafRef.current = requestAnimationFrame(simulate);

      wind += 0.02;
      const windForce = Math.sin(wind) * 0.06 + Math.sin(wind * 2.3) * 0.03;

      const ropes = ropesRef.current;
      const cursor = cursorRef.current;

      for (let r = 0; r < ropes.length; r++) {
        const rope = ropes[r];
        const pts = rope.points;

        // Verlet integration
        for (let i = 0; i < pts.length; i++) {
          const p = pts[i];
          if (p.pinned) continue;
          const vx = (p.x - p.ox) * 0.985; // friction
          const vy = (p.y - p.oy) * 0.985;
          p.ox = p.x;
          p.oy = p.y;
          p.x += vx;
          p.y += vy;
          // Gravity
          p.y += 0.18;
          // Wind — amplified at center of rope
          const midWeight = Math.sin((i / pts.length) * Math.PI);
          p.x += windForce * midWeight;

          // Cursor repulsion
          if (cursor.active) {
            const dx = p.x - cursor.x;
            const dy = p.y - cursor.y;
            const d2 = dx * dx + dy * dy;
            const R = 120;
            if (d2 < R * R && d2 > 1) {
              const d = Math.sqrt(d2);
              const f = (1 - d / R) * 1.5;
              p.x += (dx / d) * f;
              p.y += (dy / d) * f;
            }
          }
        }

        // Distance constraints
        for (let pass = 0; pass < SOLVER_PASSES; pass++) {
          for (let i = 0; i < pts.length - 1; i++) {
            const a = pts[i];
            const b = pts[i + 1];
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const d = Math.sqrt(dx * dx + dy * dy) || 0.0001;
            const diff = (d - rope.segLen) / d;
            const ox = dx * 0.5 * diff;
            const oy = dy * 0.5 * diff;
            if (!a.pinned) {
              a.x += ox;
              a.y += oy;
            }
            if (!b.pinned) {
              b.x -= ox;
              b.y -= oy;
            }
          }
        }

        // Write path
        const path = pathRefs.current[r];
        if (!path) continue;
        let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
        for (let i = 1; i < pts.length; i++) {
          d += ` L ${pts[i].x.toFixed(1)} ${pts[i].y.toFixed(1)}`;
        }
        path.setAttribute('d', d);
      }
    };

    rafRef.current = requestAnimationFrame(simulate);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('resize', initRopes);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [marionCenterXFrac, marionCenterYFrac, marionWidth, marionHeight]);

  return (
    <svg
      ref={svgRef}
      className="pointer-events-none absolute inset-0 w-full h-full"
      style={{ zIndex: 2 }}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="string-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(232,228,216,0)" />
          <stop offset="15%" stopColor="rgba(232,228,216,0.25)" />
          <stop offset="100%" stopColor="rgba(232,228,216,0.45)" />
        </linearGradient>
        <filter id="string-glow">
          <feGaussianBlur stdDeviation="0.4" />
        </filter>
      </defs>
      {ANCHORS.map((_, i) => (
        <path
          key={i}
          ref={(el) => {
            pathRefs.current[i] = el;
          }}
          stroke="url(#string-grad)"
          strokeWidth="0.6"
          fill="none"
          filter="url(#string-glow)"
          opacity="0.75"
        />
      ))}
    </svg>
  );
}
