'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'

const Hero = () => {
  const router = useRouter()

  return (
    <section
      id="home"
      className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{
        background: `linear-gradient(110deg, 
          #0f0f23 0%,
          #1a1a3a 15%,
          #252550 30%,
          #2e3561 45%,
          #364270 60%,
          #3d4a7c 75%,
          #445589 100%)`
      }}
    >
      {/* Intense purple/blue glow on left side - matching reference */}
      <div 
        className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse at 25% 50%, 
            rgba(139, 92, 246, 0.8) 0%, 
            rgba(124, 58, 237, 0.6) 15%,
            rgba(99, 102, 241, 0.4) 30%,
            rgba(79, 70, 229, 0.2) 50%,
            transparent 70%)`,
        }}
      />
      
      {/* Brighter purple highlight */}
      <div 
        className="absolute inset-0"
        style={{
          background: `radial-gradient(circle at 20% 45%,
            rgba(167, 139, 250, 0.5) 0%,
            rgba(139, 92, 246, 0.3) 20%,
            transparent 50%)`,
        }}
      />
      
      {/* Subtle vignette for depth */}
      <div 
        className="absolute inset-0"
        style={{
          background: `radial-gradient(circle at center, 
            transparent 40%,
            rgba(0, 0, 0, 0.4) 100%)`,
        }}
      />
      
      {/* Marionette - matching angel reference */}
      <div 
        className="absolute pointer-events-none"
        style={{
          top: '50%',
          right: '20%',
          width: '765px',
          height: '935px',
          backgroundImage: 'url("/assets/marion.png")',
          backgroundSize: 'contain',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center',
          transform: 'translateY(-50%) rotate(10deg)',
          opacity: 0.4,
          filter: 'brightness(1.1) contrast(1.2)',
          zIndex: 2
        }}
      />
      
      {/* Soft glow around marionette */}
      <div 
        className="absolute"
        style={{
          top: '50%',
          right: '25%',
          width: '600px',
          height: '800px',
          transform: 'translate(50%, -50%)',
          background: 'radial-gradient(circle, rgba(139, 92, 246, 0.15) 0%, rgba(99, 102, 241, 0.08) 30%, transparent 60%)',
          filter: 'blur(80px)',
          zIndex: 1
        }}
      />
      
      {/* Frozen particles */}
      <div className="absolute top-[20%] left-[10%] w-2 h-2 bg-blue-200/20 rounded-full blur-sm animate-pulse" style={{ animationDuration: '4s' }} />
      <div className="absolute top-[60%] left-[30%] w-1 h-1 bg-slate-300/30 rounded-full animate-pulse" style={{ animationDuration: '5s', animationDelay: '1s' }} />
      <div className="absolute top-[40%] right-[40%] w-2 h-2 bg-indigo-200/15 rounded-full blur-sm animate-pulse" style={{ animationDuration: '6s', animationDelay: '2s' }} />
      <div className="absolute bottom-[30%] right-[20%] w-1 h-1 bg-blue-100/25 rounded-full animate-pulse" style={{ animationDuration: '4.5s', animationDelay: '0.5s' }} />
      <div className="absolute top-[80%] left-[60%] w-3 h-3 bg-slate-200/10 rounded-full blur-md animate-pulse" style={{ animationDuration: '7s', animationDelay: '3s' }} />
      
      {/* Subtle horror fog at bottom */}
      <div 
        className="absolute bottom-0 left-0 right-0 h-48"
        style={{
          background: `linear-gradient(to top, 
            rgba(15, 23, 42, 0.6) 0%,
            rgba(15, 23, 42, 0.3) 50%,
            transparent 100%)`,
        }}
      />
      
      {/* Content - Higher z-index to appear above marionette */}
      <div className="relative z-20 text-center max-w-4xl px-5">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: "easeOut" }}
        >
          <motion.h1 
            className="font-display text-4xl md:text-6xl lg:text-7xl font-semibold mb-6 leading-tight"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 1 }}
          >
            <motion.span 
              className="block text-off-white"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 1 }}
            >
              Hi, I'm
            </motion.span>
            <motion.span 
              className="block text-white-accent text-shadow-glow"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 1 }}
            >
              Andreas Tsang.
            </motion.span>
          </motion.h1>
          
          <motion.p 
            className="text-lg md:text-xl mb-8 opacity-90"
            style={{ color: '#e9ecef' }}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9, duration: 1 }}
          >
            CS | Drones | Physics | Geochemistry | Violin
          </motion.p>
          
          <motion.div 
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2, duration: 1 }}
          >
            <motion.button
              onClick={() => router.push('/projects')}
              className="btn-primary"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              View My Work
            </motion.button>
            <motion.button
              onClick={() => router.push('/contact')}
              className="btn-secondary"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Get In Touch
            </motion.button>
          </motion.div>
        </motion.div>
      </div>
      
      {/* Scroll indicator - Higher z-index to appear above marionette */}
      <motion.div 
        className="absolute bottom-8 left-1/2 transform -translate-x-1/2 text-white-accent cursor-pointer z-30"
        onClick={() => router.push('/about')}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5, duration: 1 }}
        whileHover={{ scale: 1.1 }}
      >
        <div className="flex flex-col items-center space-y-2">
          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            <ChevronDown size={24} />
          </motion.div>
        </div>
      </motion.div>
    </section>
  )
}

export default Hero