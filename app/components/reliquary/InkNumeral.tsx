'use client';

import React, { useId } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

interface InkNumeralProps {
  numeral: string;
  className?: string;
}

/**
 * InkNumeral — a large roman numeral rendered as SVG text with:
 *  - stroke draw-in (pathLength 0 → 1)
 *  - an ink-bleed blob that grows behind the stroke
 *  - a fill that resolves in after the stroke completes
 *
 * Uses `paint-order: stroke fill` so the stroke draws first visually.
 */
export default function InkNumeral({ numeral, className = '' }: InkNumeralProps) {
  const gradId = useId().replace(/:/g, '');
  const bleedId = `bleed-${gradId}`;
  const reduceMotion = useReducedMotion();

  return (
    <svg
      viewBox="0 0 200 200"
      className={`w-full h-full ${className}`}
      aria-hidden="true"
    >
      <defs>
        <radialGradient id={bleedId} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(124,58,237,0.5)" />
          <stop offset="40%" stopColor="rgba(79,70,229,0.25)" />
          <stop offset="100%" stopColor="rgba(79,70,229,0)" />
        </radialGradient>
        <filter id={`${gradId}-blur`}>
          <feGaussianBlur stdDeviation="6" />
        </filter>
      </defs>

      {/* Ink bleed — grows outward behind the stroke */}
      <motion.ellipse
        cx="100"
        cy="100"
        rx="70"
        ry="70"
        fill={`url(#${bleedId})`}
        filter={`url(#${gradId}-blur)`}
        initial={reduceMotion ? { opacity: 0.5, scale: 1 } : { opacity: 0, scale: 0.3 }}
        whileInView={{ opacity: [0, 0.9, 0.5], scale: [0.3, 1.15, 1] }}
        viewport={{ once: true, margin: '-10% 0px' }}
        transition={{
          duration: 1.6,
          ease: [0.16, 1, 0.3, 1],
          times: [0, 0.55, 1],
        }}
        style={{ transformOrigin: 'center', transformBox: 'fill-box' }}
      />

      {/* Stroke draw-in */}
      <motion.text
        x="100"
        y="100"
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily="Cinzel, serif"
        fontSize="130"
        fontWeight="400"
        letterSpacing="2"
        fill="transparent"
        stroke="rgba(232,228,216,0.75)"
        strokeWidth="1"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ paintOrder: 'stroke fill' }}
        initial={reduceMotion ? { pathLength: 1 } : { pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={{ once: true, margin: '-10% 0px' }}
        transition={{ duration: 1.6, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
      >
        {numeral}
      </motion.text>

      {/* Fill that resolves last */}
      <motion.text
        x="100"
        y="100"
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily="Cinzel, serif"
        fontSize="130"
        fontWeight="400"
        letterSpacing="2"
        fill="rgba(232,228,216,0.04)"
        initial={reduceMotion ? { opacity: 1 } : { opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, margin: '-10% 0px' }}
        transition={{ duration: 1, delay: 1.4 }}
      >
        {numeral}
      </motion.text>
    </svg>
  );
}
