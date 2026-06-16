'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion, useMotionValue, useSpring, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { useRouter } from 'next/navigation';
import CarvedHeading from './reliquary/CarvedHeading';
import MarionetteStrings from './reliquary/MarionetteStrings';

interface HeroProps {
  name: string;
  tagline: string;
}

const MARION_W = 640;
const MARION_H = 820;

const Hero = ({ name, tagline }: HeroProps) => {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);
  const [viewport, setViewport] = useState({ w: 0, h: 0 });

  // Cursor-reactive marionette body — heavy damping
  const cursorX = useMotionValue(0);
  const cursorY = useMotionValue(0);
  const marionX = useSpring(cursorX, { stiffness: 40, damping: 25, mass: 1.2 });
  const marionY = useSpring(cursorY, { stiffness: 40, damping: 25, mass: 1.2 });

  // Parallax
  const { scrollY } = useScroll();
  const marionScrollY = useTransform(scrollY, [0, 800], [0, -120]);

  useEffect(() => {
    const update = () =>
      setViewport({ w: window.innerWidth, h: window.innerHeight });
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  useEffect(() => {
    if (reduceMotion) return;
    const handler = (e: MouseEvent) => {
      if (!sectionRef.current) return;
      const rect = sectionRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const dx = (e.clientX - centerX) / rect.width;
      const dy = (e.clientY - centerY) / rect.height;
      cursorX.set(dx * 8);
      cursorY.set(dy * 6);
    };
    window.addEventListener('mousemove', handler, { passive: true });
    return () => window.removeEventListener('mousemove', handler);
  }, [cursorX, cursorY, reduceMotion]);

  // Compute marionette center in viewport fractions so strings can attach
  // Marionette is right: 8%, width 640, vertically centered
  const marionCenterXFrac =
    viewport.w > 0 ? 1 - 0.08 - MARION_W / 2 / viewport.w : 0.72;
  const marionCenterYFrac = 0.5;

  return (
    <section
      ref={sectionRef}
      id="home"
      className="relative min-h-screen flex items-center overflow-hidden"
      style={{ background: 'transparent' }}
    >
      {/* Directional votive */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: '-20%',
          left: '-10%',
          width: '70%',
          height: '90%',
          background:
            'radial-gradient(ellipse 55% 60% at 30% 40%, rgba(79,70,229,0.28) 0%, rgba(79,70,229,0.1) 30%, transparent 65%)',
          filter: 'blur(40px)',
          zIndex: 1,
        }}
      />

      <div
        className="absolute pointer-events-none"
        style={{
          bottom: '-10%',
          right: '-10%',
          width: '60%',
          height: '70%',
          background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.8) 0%, transparent 70%)',
          zIndex: 1,
        }}
      />

      {/* Verlet-physics strings — descend from offscreen top to marionette anchors */}
      {viewport.w > 0 && (
        <MarionetteStrings
          marionCenterXFrac={marionCenterXFrac}
          marionCenterYFrac={marionCenterYFrac}
          marionWidth={MARION_W}
          marionHeight={MARION_H}
        />
      )}

      {/* Marionette silhouette */}
      <motion.div
        className="absolute pointer-events-none hidden md:block"
        style={{
          top: '50%',
          right: '8%',
          width: `${MARION_W}px`,
          height: `${MARION_H}px`,
          translateY: reduceMotion ? 0 : marionScrollY,
          x: reduceMotion ? 0 : marionX,
          y: reduceMotion ? 0 : marionY,
          zIndex: 3,
        }}
      >
        <motion.div
          className="relative h-full w-full"
          style={{
            backgroundImage: 'url("/assets/marion.png")',
            backgroundSize: 'contain',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center',
            transform: 'translateY(-50%)',
            filter:
              'brightness(0.78) contrast(1.15) saturate(0.85) drop-shadow(-6px 0 24px rgba(79,70,229,0.35))',
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.88 }}
          transition={{ delay: 0.7, duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
        />
      </motion.div>

      {/* Content */}
      <div className="relative z-20 w-full">
        <div className="container-custom">
          <div className="max-w-3xl">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
              className="mb-8"
            >
              <span className="kicker">
                <span className="text-bone/50">MMXXVI</span>
                <span className="mx-3 inline-block h-px w-6 bg-bone/20 align-middle" />
                <span>Curator&apos;s Portfolio</span>
              </span>
            </motion.div>

            {/* Letter-drop carved name */}
            <CarvedHeading
              as="h1"
              delay={0.9}
              mode="drop"
              className="text-[14vw] md:text-[10vw] lg:text-[9vw] font-normal tracking-[0.04em]"
              aberrate
            >
              {name}
            </CarvedHeading>

            <motion.p
              className="mt-8 text-lg md:text-xl italic text-ash max-w-xl"
              style={{ fontFamily: 'Crimson Text, serif' }}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 2.4, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            >
              {tagline}
            </motion.p>

            <motion.div
              className="mt-16"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 2.8, duration: 0.8 }}
            >
              <button
                onClick={() => router.push('/projects')}
                className="cta-reliquary"
                aria-label="Enter the vault"
              >
                <span className="cta-arrow" aria-hidden="true">↳</span>
                <span>Enter the vault</span>
              </button>
            </motion.div>
          </div>
        </div>
      </div>

      <motion.div
        className="absolute bottom-10 left-0 right-0 flex justify-between container-custom text-[0.65rem] kicker text-bone/30"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 3.2, duration: 1 }}
      >
        <span>N 41°·W 73°</span>
        <span className="hidden md:inline">Consecrated in silence</span>
        <span>Chapter I</span>
      </motion.div>
    </section>
  );
};

export default Hero;
