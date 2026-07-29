import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          bg:     '#FFFFFF',
          soft:   '#F8FAFC',
          main:   '#0F172A',
          muted:  '#64748B',
          accent: '#0284C7',
          mint:   '#10B981',
          line:   '#E2E8F0',
        },
      },
      fontFamily: {
        display: ['var(--font-display)', 'serif'],  // 英文衬线
        cn:      ['var(--font-cn)', 'serif'],       // 中文衬线
      },
      keyframes: {
        'fade-up': {
          '0%':   { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'ken-burns': {
          '0%':   { transform: 'scale(1)    translate(0, 0)' },
          '100%': { transform: 'scale(1.08) translate(-1%, -1%)' },
        },
      },
      animation: {
        'fade-up':   'fade-up 1s ease-out both',
        'ken-burns': 'ken-burns 24s ease-out infinite alternate',
      },
    },
  },
  plugins: [],
};

export default config;
