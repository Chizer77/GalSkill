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
        paper: {
          light: '#fdfdfc',
          dark: '#121212',
        },
        ink: {
          light: '#d4d4d4',
          dark: '#d4d4d4',
        },
        accent: {
          light: '#8b7355',
          dark: '#c4a77d',
        },
      },
      fontFamily: {
        serif: ['Noto Serif SC', 'Georgia', 'serif'],
        sans: ['Noto Sans SC', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Consolas', 'monospace'],
      },
      lineHeight: {
        relaxed: '1.625',
      },
      letterSpacing: {
        wide: '0.025em',
      },
      maxWidth: {
        '3xl': '48rem',
      },
      spacing: {
        'section': '2rem',
      },
    },
  },
  plugins: [],
}

export default config
