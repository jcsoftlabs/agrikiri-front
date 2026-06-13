import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        agri: {
          /* ── Legacy green palette (admin/dashboard intact) ── */
          green: {
            50: '#f0f9f0',
            100: '#dcf0dc',
            200: '#b8e0b8',
            300: '#83c983',
            400: '#4CAF50',
            500: '#3d9e41',
            600: '#2D7A2D',
            700: '#256025',
            800: '#1e4e1e',
            900: '#1a4a1a',
            950: '#0f2e0f',
          },
          gold: {
            300: '#E8D06B',
            400: '#D4AF37',
            500: '#B8960C',
            600: '#9A7B09',
          },
          dark: '#0A0A0A',
          cream: '#F5F5F0',

          /* ── NEW: Public dark theme palette ── */
          night: {
            50:  '#eef1f8',
            100: '#d5dcea',
            200: '#a8b8d5',
            300: '#7a93bc',
            400: '#566fa3',
            500: '#3a5189',
            600: '#2a3d6e',
            700: '#1c2d54',
            800: '#121e3a',
            900: '#0B1225',
            950: '#060a14',
          },
          ember: {
            300: '#FCD34D',
            400: '#F59E0B',
            500: '#D97706',
            600: '#B45309',
          },
          flag: {
            red:   '#D9344A',
            blue:  '#003F87',
            light: '#FF6680',
          },
        },
      },
      fontFamily: {
        /* Legacy (admin intact) */
        display: ['DM Serif Display', 'Georgia', 'serif'],
        sans:    ['DM Sans', 'Inter', 'system-ui', 'sans-serif'],

        /* New public pages */
        headline: ['Playfair Display', 'Georgia', 'serif'],
        body:     ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        mono:     ['Space Grotesk', 'monospace'],
      },
      backgroundImage: {
        'gradient-agri':  'linear-gradient(135deg, #2D7A2D 0%, #4CAF50 50%, #D4AF37 100%)',
        'gradient-dark':  'linear-gradient(180deg, #0A0A0A 0%, #1a4a1a 100%)',
        'gradient-night': 'linear-gradient(140deg, #060a14 0%, #0B1225 55%, #121e3a 100%)',
        'gradient-gold':  'linear-gradient(135deg, #F59E0B 0%, #D4AF37 50%, #FCD34D 100%)',
        'hero-pattern':   "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%234CAF50' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
        'veve-pattern':   "url(\"data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' stroke='%23F59E0B' stroke-opacity='0.06' stroke-width='1'%3E%3Ccircle cx='40' cy='40' r='30'/%3E%3Ccircle cx='40' cy='40' r='20'/%3E%3Ccircle cx='40' cy='40' r='10'/%3E%3Cline x1='10' y1='40' x2='70' y2='40'/%3E%3Cline x1='40' y1='10' x2='40' y2='70'/%3E%3Cline x1='18' y1='18' x2='62' y2='62'/%3E%3Cline x1='62' y1='18' x2='18' y2='62'/%3E%3C/g%3E%3C/svg%3E\")",
      },
      animation: {
        /* Legacy */
        'fade-in':       'fadeIn 0.5s ease-in-out both',
        'slide-up':      'slideUp 0.5s ease-out both',
        'slide-in-right':'slideInRight 0.4s ease-out both',
        'pulse-green':   'pulseGreen 2s infinite',
        'float':         'float 3s ease-in-out infinite',

        /* New strong animations */
        'reveal-up':     'revealUp 0.7s cubic-bezier(0.16, 1, 0.3, 1) both',
        'reveal-left':   'revealLeft 0.7s cubic-bezier(0.16, 1, 0.3, 1) both',
        'reveal-right':  'revealRight 0.7s cubic-bezier(0.16, 1, 0.3, 1) both',
        'shimmer':       'shimmer 2.5s linear infinite',
        'glow-pulse':    'glowPulse 2s ease-in-out infinite',
        'float-slow':    'float 6s ease-in-out infinite',
        'float-medium':  'float 4s ease-in-out infinite',
        'particle':      'particle 8s ease-in-out infinite',
        'grain':         'grainShift 0.3s steps(1) infinite',
        'spin-slow':     'spin 20s linear infinite',
        'counter':       'counterUp 1s cubic-bezier(0.16, 1, 0.3, 1) both',
        'border-dance':  'borderDance 4s linear infinite',
        'text-reveal':   'textReveal 0.8s cubic-bezier(0.16, 1, 0.3, 1) both',
        'scale-in':      'scaleIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both',
      },
      keyframes: {
        /* Legacy */
        fadeIn:       { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp:      { '0%': { transform: 'translateY(20px)', opacity: '0' }, '100%': { transform: 'translateY(0)', opacity: '1' } },
        slideInRight: { '0%': { transform: 'translateX(20px)', opacity: '0' }, '100%': { transform: 'translateX(0)', opacity: '1' } },
        pulseGreen:   { '0%, 100%': { boxShadow: '0 0 0 0 rgba(76,175,80,0.4)' }, '50%': { boxShadow: '0 0 0 10px rgba(76,175,80,0)' } },
        float:        { '0%, 100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-10px)' } },

        /* New */
        revealUp: {
          '0%':   { transform: 'translateY(60px)', opacity: '0' },
          '100%': { transform: 'translateY(0)',    opacity: '1' },
        },
        revealLeft: {
          '0%':   { transform: 'translateX(-60px)', opacity: '0' },
          '100%': { transform: 'translateX(0)',      opacity: '1' },
        },
        revealRight: {
          '0%':   { transform: 'translateX(60px)', opacity: '0' },
          '100%': { transform: 'translateX(0)',     opacity: '1' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% center' },
          '100%': { backgroundPosition:  '200% center' },
        },
        glowPulse: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(245,158,11,0.3), 0 0 40px rgba(245,158,11,0.1)' },
          '50%':      { boxShadow: '0 0 40px rgba(245,158,11,0.6), 0 0 80px rgba(245,158,11,0.2)' },
        },
        particle: {
          '0%':   { transform: 'translateY(0) translateX(0) rotate(0deg)',   opacity: '0' },
          '10%':  { opacity: '1' },
          '90%':  { opacity: '1' },
          '100%': { transform: 'translateY(-120px) translateX(40px) rotate(360deg)', opacity: '0' },
        },
        grainShift: {
          '0%':   { transform: 'translate(0, 0)' },
          '20%':  { transform: 'translate(-2px,  2px)' },
          '40%':  { transform: 'translate(-2px, -2px)' },
          '60%':  { transform: 'translate( 2px,  2px)' },
          '80%':  { transform: 'translate( 2px, -2px)' },
          '100%': { transform: 'translate(0, 0)' },
        },
        borderDance: {
          '0%':   { backgroundPosition: '0% 50%' },
          '50%':  { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
        textReveal: {
          '0%':   { clipPath: 'inset(0 100% 0 0)' },
          '100%': { clipPath: 'inset(0 0% 0 0)' },
        },
        scaleIn: {
          '0%':   { transform: 'scale(0.8)', opacity: '0' },
          '100%': { transform: 'scale(1)',   opacity: '1' },
        },
        counterUp: {
          '0%':   { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)',    opacity: '1' },
        },
      },
      boxShadow: {
        /* Legacy */
        'agri':        '0 4px 30px rgba(45, 122, 45, 0.15)',
        'agri-lg':     '0 20px 60px rgba(45, 122, 45, 0.2)',
        'gold':        '0 4px 30px rgba(212, 175, 55, 0.2)',
        'card':        '0 2px 20px rgba(0, 0, 0, 0.08)',
        'card-hover':  '0 8px 40px rgba(0, 0, 0, 0.15)',

        /* New dark theme */
        'glow-green':  '0 0 30px rgba(34, 197, 94, 0.25), 0 0 60px rgba(34, 197, 94, 0.1)',
        'glow-gold':   '0 0 30px rgba(245, 158, 11, 0.35), 0 0 60px rgba(245, 158, 11, 0.15)',
        'glow-red':    '0 0 30px rgba(217, 52, 74, 0.3)',
        'night-card':  '0 4px 40px rgba(0, 0, 0, 0.5), 0 1px 0 rgba(255,255,255,0.05) inset',
        'night-hover': '0 8px 60px rgba(0, 0, 0, 0.7), 0 0 30px rgba(245,158,11,0.15)',
        'inner-glow':  'inset 0 1px 0 rgba(255,255,255,0.08)',
      },
      transitionTimingFunction: {
        'spring': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        'expo':   'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      backdropBlur: {
        'xs':  '2px',
        '3xl': '64px',
      },
    },
  },
  plugins: [],
};

export default config;
