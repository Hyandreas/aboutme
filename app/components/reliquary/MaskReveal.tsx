'use client';

import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';

interface MaskRevealProps {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  once?: boolean;
  className?: string;
  as?: 'div' | 'section' | 'span';
}

export default function MaskReveal({
  children,
  delay = 0,
  duration = 0.9,
  once = true,
  className = '',
  as = 'div',
}: MaskRevealProps) {
  const reduceMotion = useReducedMotion();
  const Tag = motion[as];

  if (reduceMotion) {
    return <Tag className={className}>{children}</Tag>;
  }

  return (
    <Tag
      className={className}
      initial={{ clipPath: 'inset(50% 0 50% 0)', opacity: 0 }}
      whileInView={{ clipPath: 'inset(0% 0 0% 0)', opacity: 1 }}
      viewport={{ once, margin: '-10% 0px' }}
      transition={{
        duration,
        delay,
        ease: [0.16, 1, 0.3, 1],
      }}
    >
      {children}
    </Tag>
  );
}
