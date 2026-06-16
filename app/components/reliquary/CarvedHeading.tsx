'use client';

import React, { useRef, useState } from 'react';
import { motion, useReducedMotion, type Variants } from 'framer-motion';

interface CarvedHeadingProps {
  children: string;
  as?: 'h1' | 'h2' | 'h3';
  className?: string;
  delay?: number;
  aberrate?: boolean;
  /**
   * 'drop' — letters fall from ceiling, rotate, spring-settle, emit dust.
   *          Use on hero-scale / chapter-opening headings.
   * 'mask' — original mask-reveal. Quieter, for secondary headings.
   */
  mode?: 'drop' | 'mask';
}

const maskContainerVariants: Variants = {
  initial: {},
  animate: {
    transition: { staggerChildren: 0.04, delayChildren: 0.1 },
  },
};

const maskLetterVariants: Variants = {
  initial: { y: '0.6em', opacity: 0 },
  animate: {
    y: 0,
    opacity: 1,
    transition: { duration: 0.9, ease: [0.16, 1, 0.3, 1] },
  },
};

interface DustPuff {
  id: number;
  x: number; // relative to container
  y: number;
}

export default function CarvedHeading({
  children,
  as = 'h1',
  className = '',
  delay = 0,
  aberrate = true,
  mode = 'drop',
}: CarvedHeadingProps) {
  const reduceMotion = useReducedMotion();
  const Tag = motion[as];
  const text = children;
  const containerRef = useRef<HTMLDivElement>(null);
  const letterRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const [puffs, setPuffs] = useState<DustPuff[]>([]);
  const puffIdRef = useRef(0);

  const baseClass = `font-display carved ${
    aberrate ? 'aberrate' : ''
  } leading-[0.95] ${className}`;

  // Emit a dust puff at a letter's position
  const emitPuff = (letterIndex: number) => {
    const el = letterRefs.current[letterIndex];
    const container = containerRef.current;
    if (!el || !container) return;
    const elRect = el.getBoundingClientRect();
    const cRect = container.getBoundingClientRect();
    const x = elRect.left - cRect.left + elRect.width / 2;
    const y = elRect.top - cRect.top + elRect.height - 4;
    const id = ++puffIdRef.current;
    setPuffs((prev) => [...prev, { id, x, y }]);
    setTimeout(() => {
      setPuffs((prev) => prev.filter((p) => p.id !== id));
    }, 1200);
  };

  // No motion fallback
  if (reduceMotion) {
    return (
      <Tag className={baseClass} data-text={text}>
        {text}
      </Tag>
    );
  }

  // Mask-reveal mode — secondary headings
  if (mode === 'mask') {
    const words = text.split(' ');
    return (
      <Tag className={baseClass} data-text={text} aria-label={text}>
        <motion.span
          className="inline-block overflow-hidden"
          style={{ display: 'inline-block' }}
          variants={maskContainerVariants}
          initial="initial"
          animate="animate"
          transition={{ delay }}
          aria-hidden="true"
        >
          {words.map((word, wi) => (
            <span key={wi} className="inline-block whitespace-nowrap">
              {word.split('').map((char, ci) => (
                <motion.span
                  key={ci}
                  className="inline-block"
                  variants={maskLetterVariants}
                  style={{ willChange: 'transform' }}
                >
                  {char}
                </motion.span>
              ))}
              {wi < words.length - 1 && <span className="inline-block">&nbsp;</span>}
            </span>
          ))}
        </motion.span>
      </Tag>
    );
  }

  // Drop mode — letters fall with gravity + rotation + impact dust
  // Letters arrive staggered, each with slight random tilt and scale crunch at impact.
  const chars = Array.from(text);

  return (
    <div ref={containerRef} className="relative">
      <Tag
        className={baseClass}
        data-text={text}
        aria-label={text}
      >
        <span className="inline-block" aria-hidden="true">
          {chars.map((char, i) => {
            if (char === ' ') {
              return (
                <span key={i} className="inline-block">
                  &nbsp;
                </span>
              );
            }

            const charDelay = delay + i * 0.06 + Math.random() * 0.02;
            const tilt = (Math.random() - 0.5) * 14; // rotate on fall
            const settle = (Math.random() - 0.5) * 1.2; // tiny final rotation

            return (
              <motion.span
                key={i}
                ref={(el) => {
                  letterRefs.current[i] = el;
                }}
                className="inline-block relative"
                style={{ willChange: 'transform', transformOrigin: 'center bottom' }}
                initial={{
                  y: '-120%',
                  opacity: 0,
                  rotate: tilt,
                  scaleY: 1.05,
                }}
                animate={{
                  y: [
                    '-120%', // start ceiling
                    '0%',    // impact
                    '-8%',   // bounce up
                    '0%',    // settle
                  ],
                  opacity: [0, 1, 1, 1],
                  rotate: [tilt, 0, settle, 0],
                  scaleY: [1.05, 0.82, 1.04, 1], // squash & stretch
                }}
                transition={{
                  duration: 1.1,
                  delay: charDelay,
                  times: [0, 0.55, 0.78, 1],
                  ease: [0.34, 1.4, 0.5, 1],
                }}
                onAnimationStart={() => {
                  // Schedule dust puff at impact frame
                  setTimeout(
                    () => emitPuff(i),
                    (charDelay + 1.1 * 0.55) * 1000
                  );
                }}
              >
                {char}
              </motion.span>
            );
          })}
        </span>
      </Tag>

      {/* Dust puffs — per-letter impact plume */}
      <div className="pointer-events-none absolute inset-0 overflow-visible">
        {puffs.map((p) => (
          <DustPlume key={p.id} x={p.x} y={p.y} />
        ))}
      </div>
    </div>
  );
}

function DustPlume({ x, y }: { x: number; y: number }) {
  // 6-8 particles burst outward and upward
  const particles = React.useMemo(() => {
    const count = 7;
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      angle: (Math.PI * (0.15 + Math.random() * 0.7)) + Math.PI, // upward hemisphere
      speed: 20 + Math.random() * 35,
      size: 1 + Math.random() * 2.5,
      life: 0.9 + Math.random() * 0.3,
    }));
  }, []);

  return (
    <div
      className="absolute"
      style={{
        left: x,
        top: y,
        width: 0,
        height: 0,
      }}
    >
      {particles.map((p) => {
        const dx = Math.cos(p.angle) * p.speed;
        const dy = Math.sin(p.angle) * p.speed;
        return (
          <motion.span
            key={p.id}
            className="absolute rounded-full"
            style={{
              left: -p.size / 2,
              top: -p.size / 2,
              width: p.size,
              height: p.size,
              background: 'rgba(232,228,216,0.6)',
              filter: 'blur(1px)',
              willChange: 'transform, opacity',
            }}
            initial={{ x: 0, y: 0, opacity: 0.7, scale: 1 }}
            animate={{
              x: dx,
              y: dy + 6,
              opacity: 0,
              scale: 2.4,
            }}
            transition={{
              duration: p.life,
              ease: [0.22, 1, 0.36, 1],
            }}
          />
        );
      })}
    </div>
  );
}
