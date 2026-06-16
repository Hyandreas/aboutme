'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { usePathname } from 'next/navigation';

export default function PageCurtain() {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();
  const [phase, setPhase] = useState<'idle' | 'entering'>('entering');

  useEffect(() => {
    setPhase('entering');
    const t = setTimeout(() => setPhase('idle'), 900);
    return () => clearTimeout(t);
  }, [pathname]);

  if (reduceMotion) return null;

  return (
    <AnimatePresence mode="wait">
      {phase === 'entering' && (
        <motion.div
          key={pathname}
          className="fixed inset-0 pointer-events-none"
          style={{ zIndex: 90, background: 'var(--void)' }}
          initial={{ y: 0 }}
          animate={{ y: '-100%' }}
          exit={{ y: '-100%' }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Top rim-light flash as curtain rises */}
          <motion.div
            className="absolute left-0 right-0 bottom-0 h-px"
            style={{
              background:
                'linear-gradient(to right, transparent, rgba(124,58,237,0.6) 50%, transparent)',
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0] }}
            transition={{ duration: 0.9, times: [0, 0.3, 1] }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
