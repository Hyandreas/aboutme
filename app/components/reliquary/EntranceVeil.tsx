'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion, useAnimate, useReducedMotion } from 'framer-motion';

const ARRIVE: [number, number, number, number] = [0.16, 1, 0.3, 1];
const RIP: [number, number, number, number] = [0.6, 0, 1, 0.4];

type Side = 'left' | 'right';

function SmokeHalf({ side, seedOffset }: { side: Side; seedOffset: number }) {
  const id = `smoke-${side}`;
  const isLeft = side === 'left';
  return (
    <svg
      aria-hidden="true"
      className="absolute inset-0 h-full w-full"
      preserveAspectRatio="xMidYMid slice"
      viewBox="0 0 1000 1000"
    >
      <defs>
        {/* Primary volumetric noise — SMIL-animated so it actually churns */}
        <filter id={`${id}-f1`} x="-25%" y="-25%" width="150%" height="150%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.009 0.014"
            numOctaves="4"
            seed={seedOffset}
            stitchTiles="stitch"
          >
            <animate
              attributeName="baseFrequency"
              values="0.009 0.014;0.013 0.019;0.008 0.012;0.011 0.016;0.009 0.014"
              dur="7s"
              repeatCount="indefinite"
            />
          </feTurbulence>
          <feDisplacementMap in="SourceGraphic" scale="200">
            <animate
              attributeName="scale"
              values="180;240;162;218;180"
              dur="5.5s"
              repeatCount="indefinite"
            />
          </feDisplacementMap>
          <feGaussianBlur stdDeviation="13" />
        </filter>

        {/* Secondary wisp layer */}
        <filter id={`${id}-f2`} x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.022 0.034"
            numOctaves="2"
            seed={seedOffset + 7}
            stitchTiles="stitch"
          >
            <animate
              attributeName="baseFrequency"
              values="0.022 0.034;0.028 0.040;0.019 0.030;0.024 0.036;0.022 0.034"
              dur="4s"
              repeatCount="indefinite"
            />
          </feTurbulence>
          <feDisplacementMap in="SourceGraphic" scale="90" />
          <feGaussianBlur stdDeviation="5" />
        </filter>

        <radialGradient id={`${id}-base`} cx={isLeft ? '35%' : '65%'} cy="55%" r="85%">
          <stop offset="0%" stopColor="#0C0A18" stopOpacity="0.96" />
          <stop offset="45%" stopColor="#050309" stopOpacity="0.98" />
          <stop offset="100%" stopColor="#050309" stopOpacity="1" />
        </radialGradient>

        <radialGradient id={`${id}-votive`} cx={isLeft ? '28%' : '72%'} cy="42%" r="70%">
          <stop offset="0%" stopColor="#4F46E5" stopOpacity="0.38" />
          <stop offset="35%" stopColor="#7C3AED" stopOpacity="0.17" />
          <stop offset="100%" stopColor="#050309" stopOpacity="0" />
        </radialGradient>

        <linearGradient id={`${id}-tear`} x1="0%" y1="0%" x2="100%" y2="0%">
          {isLeft ? (
            <>
              <stop offset="0%" stopColor="#000" stopOpacity="1" />
              <stop offset="82%" stopColor="#000" stopOpacity="1" />
              <stop offset="100%" stopColor="#000" stopOpacity="0" />
            </>
          ) : (
            <>
              <stop offset="0%" stopColor="#000" stopOpacity="0" />
              <stop offset="18%" stopColor="#000" stopOpacity="1" />
              <stop offset="100%" stopColor="#000" stopOpacity="1" />
            </>
          )}
        </linearGradient>

        <mask id={`${id}-mask`}>
          <rect width="1000" height="1000" fill={`url(#${id}-tear)`} />
        </mask>
      </defs>

      <g mask={`url(#${id}-mask)`}>
        <rect width="1000" height="1000" fill={`url(#${id}-base)`} />
        <g style={{ mixBlendMode: 'screen' }} opacity="0.6">
          <rect width="1000" height="1000" fill="#1a1530" filter={`url(#${id}-f1)`} />
        </g>
        <g style={{ mixBlendMode: 'screen' }} opacity="0.36">
          <rect width="1000" height="1000" fill="#3b2f6b" filter={`url(#${id}-f2)`} />
        </g>
        <rect
          width="1000"
          height="1000"
          fill={`url(#${id}-votive)`}
          style={{ mixBlendMode: 'screen' }}
        />
      </g>
    </svg>
  );
}

function Claw({ side }: { side: Side }) {
  const id = `claw-${side}`;
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 500 420"
      className="h-full w-full"
      style={{ transform: side === 'right' ? 'scaleX(-1)' : undefined }}
    >
      <defs>
        <linearGradient id={`${id}-arm`} x1="0%" y1="50%" x2="100%" y2="50%">
          <stop offset="0%" stopColor="#050309" stopOpacity="0" />
          <stop offset="30%" stopColor="#0C0A18" stopOpacity="0.9" />
          <stop offset="70%" stopColor="#1a1530" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#2d1b4e" stopOpacity="0.95" />
        </linearGradient>
        <linearGradient id={`${id}-bone`} x1="0%" y1="50%" x2="100%" y2="50%">
          <stop offset="0%" stopColor="#8B8FA8" />
          <stop offset="55%" stopColor="#E8E4D8" />
          <stop offset="100%" stopColor="#E8E4D8" />
        </linearGradient>
        {/* Stronger phantom glow */}
        <filter id={`${id}-glow`} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feColorMatrix
            in="blur"
            values="0 0 0 0 0.31
                    0 0 0 0 0.27
                    0 0 0 0 0.90
                    0 0 0 0.85 0"
            result="coloredBlur"
          />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Forearm fading into void */}
      <path
        d="M 0 170 Q 80 150 150 180 L 170 260 Q 90 280 0 260 Z"
        fill={`url(#${id}-arm)`}
      />

      {/* Palm */}
      <path
        d="M 130 170 Q 180 150 240 160 Q 275 175 280 215 Q 265 260 220 270 Q 170 275 135 255 Q 118 220 130 170 Z"
        fill="#0C0A18"
        stroke="#8B8FA8"
        strokeOpacity="0.4"
        strokeWidth="0.9"
      />

      <g filter={`url(#${id}-glow)`}>
        <path
          d="M 235 160 Q 270 110 285 55 L 298 58 Q 290 118 258 172 Z"
          fill={`url(#${id}-bone)`}
        />
        <path
          d="M 270 170 Q 330 130 395 95 L 405 108 Q 345 150 285 188 Z"
          fill={`url(#${id}-bone)`}
        />
        <path
          d="M 282 200 Q 360 185 445 175 L 448 192 Q 365 208 288 222 Z"
          fill={`url(#${id}-bone)`}
        />
        <path
          d="M 278 230 Q 345 245 410 268 L 404 282 Q 340 265 276 248 Z"
          fill={`url(#${id}-bone)`}
        />
        <path
          d="M 260 258 Q 310 290 355 325 L 345 335 Q 300 304 250 272 Z"
          fill={`url(#${id}-bone)`}
        />

        {/* Talon tips */}
        <path d="M 298 58 L 310 40 L 302 62 Z" fill="#E8E4D8" />
        <path d="M 405 108 L 422 98 L 408 117 Z" fill="#E8E4D8" />
        <path d="M 448 192 L 468 189 L 448 203 Z" fill="#E8E4D8" />
        <path d="M 410 268 L 428 276 L 404 279 Z" fill="#E8E4D8" />
        <path d="M 355 325 L 370 340 L 348 333 Z" fill="#E8E4D8" />
      </g>

      {/* Knuckle rim-light */}
      <path
        d="M 235 165 Q 260 158 275 170"
        stroke="rgba(232,228,216,0.4)"
        strokeWidth="0.9"
        fill="none"
      />
    </svg>
  );
}

export default function EntranceVeil() {
  const reduceMotion = useReducedMotion();
  const [scope, animate] = useAnimate();
  const [visible, setVisible] = useState(true);

  const smokeL = useRef<HTMLDivElement>(null);
  const smokeR = useRef<HTMLDivElement>(null);
  const seamEl = useRef<HTMLDivElement>(null);
  const clawL = useRef<HTMLDivElement>(null);
  const clawR = useRef<HTMLDivElement>(null);
  const voidEl = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!visible) return;
    document.body.style.overflow = 'hidden';

    if (reduceMotion) {
      animate(scope.current, { opacity: 0 }, { duration: 0.5 });
      const t = setTimeout(() => {
        setVisible(false);
        document.body.style.overflow = '';
      }, 600);
      return () => clearTimeout(t);
    }

    const run = async () => {
      try {
        // ── 1. SMOKE ROLLS IN (0 – 1.0s) ────────────────────────────────
        await animate([
          [smokeL.current!, { opacity: 1 }, { duration: 1.0, ease: ARRIVE }],
          [smokeR.current!, { opacity: 1 }, { duration: 1.0, ease: ARRIVE, at: '<' }],
        ]);

        // ── 2. ATMOSPHERIC HOLD (1.0 – 1.7s) ────────────────────────────
        await new Promise<void>(r => setTimeout(r, 500));

        // ── 3. SEAM TEARS OPEN (1.5 – 2.0s) — fire without await ────────
        animate(
          seamEl.current!,
          { opacity: 1, scaleY: 1 },
          { duration: 0.55, ease: ARRIVE }
        );
        await new Promise<void>(r => setTimeout(r, 380));

        // ── 4. CLAWS EMERGE FROM SIDES (1.88 – 2.58s) ───────────────────
        await animate([
          [clawL.current!, { x: '-8%', rotate: -3, opacity: 1 }, { duration: 0.7, ease: ARRIVE }],
          [clawR.current!, { x: '8%', rotate: 3, opacity: 1 }, { duration: 0.7, ease: ARRIVE, at: '+0.08' }],
        ]);

        // ── 5. CLAWS HOOK PAST CENTER — tension moment (2.58 – 2.9s) ────
        await animate([
          [clawL.current!, { x: '5%', rotate: 2 }, { duration: 0.34, ease: [0.5, 0, 0.5, 1] }],
          [clawR.current!, { x: '-5%', rotate: -2 }, { duration: 0.34, ease: [0.5, 0, 0.5, 1], at: '<' }],
        ]);

        // Tiny pause for dramatic tension before the rip
        await new Promise<void>(r => setTimeout(r, 90));

        // ── 6. THE RIP — all fire at the exact same JS tick ──────────────
        //    at: '<' means every element starts simultaneously
        await animate([
          [clawL.current!, { x: '-130%', rotate: 8, opacity: 0 }, { duration: 1.1, ease: RIP }],
          [clawR.current!, { x: '130%', rotate: -8, opacity: 0 }, { duration: 1.1, ease: RIP, at: '<' }],
          [smokeL.current!, { x: '-118%', scaleX: 1.3, opacity: 0 }, { duration: 1.2, ease: RIP, at: '<' }],
          [smokeR.current!, { x: '118%', scaleX: 1.3, opacity: 0 }, { duration: 1.2, ease: RIP, at: '<' }],
          [seamEl.current!, { opacity: 0, scaleY: 1.4 }, { duration: 0.35, ease: 'easeIn', at: '<' }],
          [voidEl.current!, { opacity: 0 }, { duration: 0.8, ease: 'easeOut', at: '+0.5' }],
        ]);

        document.body.style.overflow = '';
        setVisible(false);
      } catch {
        // Sequence aborted (component unmounted mid-animation)
        document.body.style.overflow = '';
      }
    };

    run();
    return () => { document.body.style.overflow = ''; };
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  if (!visible) return null;

  const CLAW_W = 'clamp(260px, 42vw, 620px)';

  return (
    <div
      ref={scope}
      aria-hidden="true"
      className="fixed inset-0 overflow-hidden"
      style={{ zIndex: 200 }}
    >
      {/* Base void */}
      <div
        ref={voidEl}
        className="absolute inset-0"
        style={{ background: 'var(--void)' }}
      />

      {/* Smoke — left half */}
      <motion.div
        ref={smokeL}
        className="absolute inset-0"
        style={{ opacity: 0, transformOrigin: 'left center' }}
      >
        {/* Y-drift wrapper — only moves vertically, never fights the X pull */}
        <motion.div
          className="absolute inset-0"
          animate={{ y: [0, -18, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        >
          <SmokeHalf side="left" seedOffset={3} />
        </motion.div>
      </motion.div>

      {/* Smoke — right half */}
      <motion.div
        ref={smokeR}
        className="absolute inset-0"
        style={{ opacity: 0, transformOrigin: 'right center' }}
      >
        <motion.div
          className="absolute inset-0"
          animate={{ y: [0, 14, 0] }}
          transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
        >
          <SmokeHalf side="right" seedOffset={17} />
        </motion.div>
      </motion.div>

      {/* Seam — hot votive line at center */}
      <motion.div
        ref={seamEl}
        className="absolute top-0 bottom-0"
        style={{
          left: '50%',
          width: '2px',
          marginLeft: '-1px',
          opacity: 0,
          scaleY: 0.15,
          transformOrigin: 'center center',
          background:
            'linear-gradient(to bottom, transparent 0%, rgba(232,228,216,0.9) 18%, rgba(124,58,237,1) 50%, rgba(232,228,216,0.9) 82%, transparent 100%)',
          boxShadow:
            '0 0 14px 2px rgba(124,58,237,0.95), 0 0 48px 12px rgba(79,70,229,0.6)',
          filter: 'blur(0.3px)',
        }}
      />

      {/* Left claw */}
      <motion.div
        ref={clawL}
        className="absolute pointer-events-none"
        style={{
          top: '48%',
          left: 0,
          width: CLAW_W,
          aspectRatio: '500 / 420',
          x: '-120%',
          y: '-50%',
          rotate: -6,
          opacity: 0,
          filter:
            'drop-shadow(0 18px 40px rgba(5,3,9,0.95)) drop-shadow(0 0 30px rgba(79,70,229,0.55))',
        }}
      >
        <Claw side="left" />
      </motion.div>

      {/* Right claw */}
      <motion.div
        ref={clawR}
        className="absolute pointer-events-none"
        style={{
          top: '52%',
          right: 0,
          width: CLAW_W,
          aspectRatio: '500 / 420',
          x: '120%',
          y: '-50%',
          rotate: 6,
          opacity: 0,
          filter:
            'drop-shadow(0 18px 40px rgba(5,3,9,0.95)) drop-shadow(0 0 30px rgba(124,58,237,0.55))',
        }}
      >
        <Claw side="right" />
      </motion.div>

      {/* Skip button */}
      <motion.button
        type="button"
        className="absolute kicker"
        style={{
          top: '1.5rem',
          right: '1.5rem',
          color: 'rgba(232,228,216,0.55)',
          padding: '0.75rem 1rem',
          minWidth: 44,
          minHeight: 44,
          background: 'transparent',
          border: '1px solid rgba(232,228,216,0.12)',
          cursor: 'pointer',
        }}
        onClick={() => {
          document.body.style.overflow = '';
          setVisible(false);
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0, 0.8] }}
        transition={{ duration: 1.4, times: [0, 0.4, 1], ease: ARRIVE }}
        whileHover={{ color: 'rgba(232,228,216,0.95)' }}
      >
        Skip ↳
      </motion.button>
    </div>
  );
}
