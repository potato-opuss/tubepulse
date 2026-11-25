import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: 'rgb(var(--tp-bg) / <alpha-value>)',
        card: 'rgb(var(--tp-card) / <alpha-value>)',
        line: 'rgb(var(--tp-line) / <alpha-value>)',
        ink: 'rgb(var(--tp-ink) / <alpha-value>)',
        muted: 'rgb(var(--tp-muted) / <alpha-value>)',
        primary: 'rgb(var(--tp-primary) / <alpha-value>)',
        positive: 'rgb(var(--tp-positive) / <alpha-value>)',
        negative: 'rgb(var(--tp-negative) / <alpha-value>)',
        warning: 'rgb(var(--tp-warning) / <alpha-value>)',
      },
      fontFamily: {
        sans: [
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          '"Helvetica Neue"',
          'Arial',
          'sans-serif',
        ],
      },
      boxShadow: {
        soft: '0 1px 2px rgb(0 0 0 / 0.28), 0 8px 24px -16px rgb(0 0 0 / 0.55)',
      },
      borderRadius: {
        '2xl': '1rem',
      },
    },
  },
  plugins: [],
} satisfies Config;
