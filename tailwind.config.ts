import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        parchment: 'var(--gs-parchment)',
        ivory: 'var(--gs-ivory)',
        sand: 'var(--gs-sand)',
        brand: {
          DEFAULT: 'var(--gs-brand)',
          light: 'var(--gs-brand-light)',
        },
        'near-black': 'var(--gs-near-black)',
        'dark-warm': 'var(--gs-dark-warm)',
        olive: 'var(--gs-olive)',
        stone: 'var(--gs-stone)',
        border: 'var(--gs-border)',
        'border-soft': 'var(--gs-border-soft)',
        'tag-bg': 'var(--gs-tag-bg)',
      },
      fontFamily: {
        serif: ['var(--font-tsanger)', '"Noto Serif CJK SC"', '"Source Han Serif SC"', 'Georgia', 'serif'],
        sans: ['"Noto Sans SC"', '"Noto Sans CJK SC"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Fira Code"', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
}

export default config
