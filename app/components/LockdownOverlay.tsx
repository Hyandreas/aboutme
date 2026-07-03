'use client';

import { motion } from 'framer-motion';

interface LockdownOverlayProps {
  kicker: string;
  title: string;
  message: string;
}

// Drop animation timing (seconds from component mount)
const DROP_DELAY = 0.25;
const DROP_DURATION = 1.0;
const IMPACT_FRAC = 0.68;                            // fraction of DROP_DURATION when panel hits "floor"
const IMPACT_AT = DROP_DELAY + DROP_DURATION * IMPACT_FRAC; // ~0.93s

export default function LockdownOverlay({ kicker, title, message }: LockdownOverlayProps) {
  return (
    <>
      {/* Full-screen blur + dark veil */}
      <motion.div
        className="fixed inset-0"
        style={{
          zIndex: 9998,
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          background: 'rgba(1, 0, 6, 0.78)',
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.7 }}
      />

      {/* Centered drop container */}
      <div
        className="fixed inset-0 flex items-center justify-center px-5"
        style={{ zIndex: 9999, pointerEvents: 'none' }}
      >
        <motion.div
          className="relative w-full max-w-2xl px-10 pb-12 pt-10"
          initial={{ y: '-110vh', scaleY: 1 }}
          animate={{
            y:      ['-110vh',  '0px',   '6px',  '-8px',  '0px'],
            scaleY: [1,          0.90,    1.05,    0.97,    1   ],
          }}
          transition={{
            duration: DROP_DURATION,
            delay: DROP_DELAY,
            times: [0, IMPACT_FRAC, 0.78, 0.89, 1.0],
            ease: 'easeIn',
          }}
          style={{
            transformOrigin: 'center bottom',
            background: 'rgba(1, 0, 8, 0.98)',
            border: '1px solid rgba(99, 102, 241, 0.2)',
            borderRadius: '0.75rem',
            boxShadow: '0 40px 100px rgba(0,0,0,0.97), 0 0 50px rgba(99,102,241,0.1)',
          }}
        >
          {/* Top glow edge */}
          <div
            className="absolute top-0 left-0 right-0 h-px rounded-t-xl"
            style={{
              background: 'linear-gradient(to right, transparent, rgba(99,102,241,0.7) 30%, rgba(118,0,168,0.9) 50%, rgba(99,102,241,0.7) 70%, transparent)',
            }}
          />
          <div
            className="absolute top-px left-0 right-0 h-px"
            style={{
              background: 'linear-gradient(to right, transparent, rgba(99,102,241,0.15) 30%, rgba(99,102,241,0.3) 50%, rgba(99,102,241,0.15) 70%, transparent)',
            }}
          />

          {/* Impact: border glow flash */}
          <motion.div
            className="absolute inset-0 rounded-xl pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0, 1, 0] }}
            transition={{
              delay: DROP_DELAY,
              duration: DROP_DURATION,
              times: [0, IMPACT_FRAC - 0.02, IMPACT_FRAC + 0.03, 1.0],
              ease: 'easeOut',
            }}
            style={{
              boxShadow: '0 0 80px rgba(99,102,241,0.5), 0 0 140px rgba(118,0,168,0.3), inset 0 0 30px rgba(99,102,241,0.15)',
              border: '1px solid rgba(99,102,241,0.55)',
              borderRadius: '0.75rem',
            }}
          />

          {/* Impact: shockwave line from bottom edge */}
          <motion.div
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: [0, 1, 2.2], opacity: [0, 0.85, 0] }}
            transition={{
              delay: IMPACT_AT,
              duration: 0.55,
              times: [0, 0.2, 1],
              ease: 'easeOut',
            }}
            style={{
              position: 'absolute',
              bottom: -1,
              left: 0,
              right: 0,
              height: 1,
              background: 'linear-gradient(to right, transparent, rgba(99,102,241,0.85) 25%, rgba(118,0,168,0.95) 50%, rgba(99,102,241,0.85) 75%, transparent)',
              transformOrigin: 'center',
            }}
          />

          {/* Content */}
          <div className="text-center space-y-5">
            <motion.p
              className="text-xs tracking-[0.5em] uppercase"
              style={{ color: 'rgba(99,102,241,0.5)', fontFamily: 'Cinzel, serif' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: IMPACT_AT + 0.05, duration: 0.7 }}
            >
              {kicker}
            </motion.p>

            <motion.h1
              className="font-display text-3xl md:text-4xl font-bold"
              style={{
                color: '#e2e8f0',
                textShadow: '0 0 30px rgba(99,102,241,0.4), 0 0 60px rgba(99,102,241,0.15)',
                letterSpacing: '0.08em',
              }}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: IMPACT_AT + 0.2, duration: 0.7 }}
            >
              {title}
            </motion.h1>

            <motion.div
              className="mx-auto h-px w-40"
              style={{
                background: 'linear-gradient(to right, transparent, rgba(74,111,165,0.6), rgba(99,102,241,0.8), rgba(74,111,165,0.6), transparent)',
              }}
              initial={{ scaleX: 0, opacity: 0 }}
              animate={{ scaleX: 1, opacity: 1 }}
              transition={{ delay: IMPACT_AT + 0.4, duration: 0.6 }}
            />

            <motion.p
              style={{ color: 'rgba(148,163,184,0.8)', fontFamily: 'Crimson Text, serif', fontSize: '1.1rem' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: IMPACT_AT + 0.6, duration: 0.8 }}
            >
              {message}
            </motion.p>
          </div>
        </motion.div>
      </div>
    </>
  );
}
