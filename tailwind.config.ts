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
          },
          gold: {
            300: '#E8D06B',
            400: '#D4AF37',
            500: '#B8960C',
            600: '#9A7B09',
          },
          dark: '#0A0A0A',
          cream: '#F5F5F0',
        },
      },
      fontFamily: {
        display: ['DM Serif Display', 'Georgia', 'serif'],
        sans: ['DM Sans', 'Inter', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-agri': 'linear-gradient(135deg, #2D7A2D 0%, #4CAF50 50%, #D4AF37 100%)',
        'gradient-dark': 'linear-gradient(180deg, #0A0A0A 0%, #1a4a1a 100%)',
        'hero-pattern': "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%234CAF50' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.5s ease-out',
        'slide-in-right': 'slideInRight 0.4s ease-out',
        'pulse-green': 'pulseGreen 2s infinite',
        'float': 'float 3s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp: { '0%': { transform: 'translateY(20px)', opacity: '0' }, '100%': { transform: 'translateY(0)', opacity: '1' } },
        slideInRight: { '0%': { transform: 'translateX(20px)', opacity: '0' }, '100%': { transform: 'translateX(0)', opacity: '1' } },
        pulseGreen: { '0%, 100%': { boxShadow: '0 0 0 0 rgba(76, 175, 80, 0.4)' }, '50%': { boxShadow: '0 0 0 10px rgba(76, 175, 80, 0)' } },
        float: { '0%, 100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-10px)' } },
      },
      boxShadow: {
        'agri': '0 4px 30px rgba(45, 122, 45, 0.15)',
        'agri-lg': '0 20px 60px rgba(45, 122, 45, 0.2)',
        'gold': '0 4px 30px rgba(212, 175, 55, 0.2)',
        'card': '0 2px 20px rgba(0, 0, 0, 0.08)',
        'card-hover': '0 8px 40px rgba(0, 0, 0, 0.15)',
      },
    },
  },
  plugins: [],
};

export default config;
