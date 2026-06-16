'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';

const navItems = [
  { href: '/', label: 'Home' },
  { href: '/projects', label: 'Projects' },
];

const Navigation = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 80);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <motion.nav
      className={`fixed top-0 w-full z-50 transition-all duration-700 ${
        isScrolled
          ? 'bg-void/85 backdrop-blur-md'
          : 'bg-transparent backdrop-blur-sm'
      }`}
      style={{
        borderBottom: isScrolled
          ? '1px solid rgba(232,228,216,0.08)'
          : '1px solid transparent',
      }}
      initial={{ y: reduceMotion ? 0 : -40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.9, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="container-custom">
        <div className="flex items-center justify-between h-16">
          {/* Wolfram mark — quietly links to the Summer Research publication */}
          <Link
            href="https://community.wolfram.com/groups/-/m/t/3500658"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-3"
            aria-label="Wolfram Summer Research Program publication"
          >
            <div className="relative">
              <Image
                src="/assets/wolfram.jpeg"
                alt=""
                width={32}
                height={32}
                className="rounded-full opacity-60 group-hover:opacity-100 transition-opacity duration-500"
              />
              <div className="absolute inset-0 rounded-full ring-1 ring-bone/10 group-hover:ring-bone/30 transition-all duration-500" />
            </div>
          </Link>

          {/* Desktop — small-caps editorial labels */}
          <div className="hidden md:flex items-center gap-10">
            {navItems.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="relative group"
                  style={{
                    fontFamily: 'Cinzel, serif',
                    fontSize: '0.72rem',
                    letterSpacing: '0.3em',
                    textTransform: 'uppercase',
                    color: active ? 'var(--bone)' : 'rgba(232,228,216,0.55)',
                    transition: 'color 500ms cubic-bezier(0.16,1,0.3,1)',
                  }}
                >
                  <span className="group-hover:text-bone transition-colors duration-500">
                    {item.label}
                  </span>
                  <span
                    className="pointer-events-none absolute left-0 right-0 -bottom-2 h-px origin-left transition-transform duration-500"
                    style={{
                      background:
                        'linear-gradient(to right, transparent, rgba(232,228,216,0.7), transparent)',
                      transform: active ? 'scaleX(1)' : 'scaleX(0)',
                      transitionTimingFunction: 'cubic-bezier(0.16,1,0.3,1)',
                    }}
                  />
                  <span
                    className="pointer-events-none absolute left-0 right-0 -bottom-2 h-px origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500"
                    style={{
                      background:
                        'linear-gradient(to right, transparent, rgba(232,228,216,0.7), transparent)',
                      transitionTimingFunction: 'cubic-bezier(0.16,1,0.3,1)',
                      display: active ? 'none' : 'block',
                    }}
                  />
                </Link>
              );
            })}
          </div>

          {/* Mobile trigger */}
          <motion.button
            className="md:hidden text-bone p-2"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-expanded={isMobileMenuOpen}
            aria-controls="mobile-navigation"
            aria-label={isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            whileTap={{ scale: 0.95 }}
          >
            {isMobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </motion.button>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            id="mobile-navigation"
            className="md:hidden absolute top-full left-0 w-full bg-void/95 backdrop-blur-md"
            style={{ borderBottom: '1px solid rgba(232,228,216,0.08)' }}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="container-custom py-6">
              {navItems.map((item, index) => {
                const active = pathname === item.href;
                return (
                  <motion.div
                    key={item.href}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.08, duration: 0.5 }}
                  >
                    <Link
                      href={item.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="block w-full py-3"
                      style={{
                        fontFamily: 'Cinzel, serif',
                        fontSize: '0.85rem',
                        letterSpacing: '0.3em',
                        textTransform: 'uppercase',
                        color: active ? 'var(--bone)' : 'rgba(232,228,216,0.55)',
                      }}
                    >
                      {item.label}
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
};

export default Navigation;
