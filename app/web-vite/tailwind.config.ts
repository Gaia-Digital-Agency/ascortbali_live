import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          bg: '#0b0b0b',
          surface: '#141414',
          surface2: '#1b1b1b',
          line: '#2a2a2a',
          text: '#f3f3f3',
          muted: '#b6b0a6',
          gold: '#c9a24d',
          gold2: '#b89242',
        },
      },
      fontFamily: {
        display: ['var(--font-display)', 'ui-serif', 'Georgia', 'serif'],
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      letterSpacing: {
        luxe: '0.18em',
      },
      boxShadow: {
        luxe: '0 10px 40px rgba(0,0,0,0.55)',
      },
      backgroundImage: {
        'hero-radial': 'radial-gradient(80% 60% at 50% 0%, rgba(201,162,77,0.20) 0%, rgba(11,11,11,0) 60%)',
        'grain': "url('data:image/svg+xml,%3Csvg xmlns=\"http://www.w3.org/2000/svg\" width=\"160\" height=\"160\"%3E%3Cfilter id=\"n\"%3E%3CfeTurbulence type=\"fractalNoise\" baseFrequency=\".9\" numOctaves=\"3\" stitchTiles=\"stitch\"/%3E%3C/filter%3E%3Crect width=\"160\" height=\"160\" filter=\"url(%23n)\" opacity=\".14\"/%3E%3C/svg%3E')",
      },
    },
  },
  plugins: [],
} satisfies Config
