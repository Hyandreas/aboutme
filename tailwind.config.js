/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Winter Palace Necromancy Color Palette
        'primary-dark': '#0a0a0f',
        'secondary-dark': '#0f0f18',
        'tertiary-dark': '#1a1a2e',
        'midnight-blue': '#0d1421',
        'deep-purple': '#1a1530',
        'accent-purple': '#2d1b4e',
        'ice-blue': '#4a6fa5',
        'frost-silver': '#9ba3af',
        'necro-purple': '#6366f1',
        'bone-white': '#f8fafc',
        'pale-blue': '#dbeafe',
        'white-accent': '#ffffff',
        'off-white': '#e2e8f0',
        'muted-white': '#94a3b8',
        'shadow-gray': '#1e293b',
        'winter-mist': '#334155',
      },
      fontFamily: {
        'serif': ['Crimson Text', 'serif'],
        'display': ['Cinzel', 'serif'],
        'mono': ['Special Elite', 'monospace'],
      },
      animation: {
        'winter-mist': 'winterMist 25s ease-in-out infinite alternate',
        'necro-pulse': 'necroPulse 4s ease-in-out infinite',
        'breathing-bg': 'breathingBackground 20s ease-in-out infinite alternate',
        'necrotic-presence': 'necroticPresence 15s ease-in-out infinite alternate',
        'winter-float': 'winterFloat 10s ease-in-out infinite',
        'fade-in-up': 'fadeInUp 1s ease-out forwards',
        'section-mystique': 'sectionMystique 20s ease-in-out infinite alternate',
        'necro-sweep': 'necroSweep 30s ease-in-out infinite',
        'fade-in-marionette': 'fadeInMarionette 2s ease-out forwards',
      },
      keyframes: {
        winterMist: {
          '0%': { 
            opacity: '0.6', 
            transform: 'scale3d(1, 1, 1) rotate(0deg)' 
          },
          '100%': { 
            opacity: '1', 
            transform: 'scale3d(1.3, 1.3, 1) rotate(3deg)' 
          }
        },
        necroPulse: {
          '0%, 100%': { opacity: '0.15' },
          '50%': { opacity: '0.4' }
        },
        breathingBackground: {
          '0%': { 
            transform: 'scale3d(1, 1, 1)',
            filter: 'brightness(1.0)'
          },
          '100%': { 
            transform: 'scale3d(1.05, 1.05, 1)',
            filter: 'brightness(1.2)'
          }
        },
        necroticPresence: {
          '0%': { 
            opacity: '0.2', 
            transform: 'rotate(40deg) scale3d(1, 1, 1)',
            filter: 'contrast(1.2) brightness(0.9) hue-rotate(200deg)'
          },
          '100%': { 
            opacity: '0.3', 
            transform: 'rotate(40deg) scale3d(1.02, 1.02, 1)',
            filter: 'contrast(1.3) brightness(1.0) hue-rotate(210deg)'
          }
        },
        winterFloat: {
          '0%, 100%': { transform: 'rotate(40deg) translate3d(0, 0, 0)' },
          '33%': { transform: 'rotate(40deg) translate3d(1px, -3px, 0)' },
          '66%': { transform: 'rotate(40deg) translate3d(-1px, -2px, 0)' }
        },
        fadeInUp: {
          from: {
            opacity: '0',
            transform: 'translate3d(0, 30px, 0)'
          },
          to: {
            opacity: '1',
            transform: 'translate3d(0, 0, 0)'
          }
        },
        sectionMystique: {
          '0%': { 
            opacity: '0.8', 
            transform: 'translate3d(0, 0, 0) scale3d(1, 1, 1)'
          },
          '100%': { 
            opacity: '1', 
            transform: 'translate3d(0, -5px, 0) scale3d(1.02, 1.02, 1)'
          }
        },
        necroSweep: {
          '0%': { 
            opacity: '0.1',
            transform: 'translateX(-100%) rotate(45deg)'
          },
          '50%': { 
            opacity: '0.3',
            transform: 'translateX(50%) rotate(45deg)'
          },
          '100%': { 
            opacity: '0.1',
            transform: 'translateX(200%) rotate(45deg)'
          }
        },
        fadeInMarionette: {
          '0%': { 
            opacity: '0'
          },
          '100%': { 
            opacity: '0.6'
          }
        },
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' }
        }
      },
      boxShadow: {
        'necro': '0 0 20px rgba(99, 102, 241, 0.4), 0 0 40px rgba(74, 111, 165, 0.3)',
        'frost': '0 15px 35px rgba(0, 0, 0, 0.7), 0 0 40px rgba(99, 102, 241, 0.4)',
        'winter-mystique': '0 0 30px rgba(99, 102, 241, 0.3)',
      }
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}