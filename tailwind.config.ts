import type { Config } from 'tailwindcss'
import animate from 'tailwindcss-animate'

const config: Config = {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#BA7517',
          50:  '#FEF3DC',
          100: '#FDE8B4',
          200: '#FBCA6A',
          300: '#F9AC20',
          400: '#D48F0F',
          500: '#BA7517',
          600: '#9A5F0F',
          700: '#7A4A0A',
          800: '#5A3606',
          900: '#3A2104',
        },
      },
      borderRadius: {
        lg: '0.5rem', md: '0.375rem', sm: '0.25rem',
      },
      fontFamily: { mono: ['JetBrains Mono', 'Fira Code', 'monospace'] },
    },
  },
  plugins: [animate],
}

export default config
