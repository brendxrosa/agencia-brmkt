import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        vinho: {
          DEFAULT: '#5A1A2B',
          dark: '#3F1220',
          light: '#8A4458',
        },
        rosa: {
          DEFAULT: '#B0546E',
          light: '#C97A90',
          pale: '#F5CFC8',
        },
        offwhite: '#F1E6D2',
        creme: '#E9DCC4',
        lima: '#D4F25A',
        tinta: '#2B2224',
        musgo: '#4F5A2B',
        papel: '#FBF6EC',
      },
      fontFamily: {
        display: ['Instrument Serif', 'Georgia', 'serif'],
        body: ['Bricolage Grotesque', 'system-ui', 'sans-serif'],
        mao: ['Square Peg', 'cursive'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        'card': '0 2px 8px rgba(90,26,43,0.08)',
        'card-hover': '0 8px 24px rgba(90,26,43,0.14)',
        'modal': '0 20px 60px rgba(0,0,0,0.25)',
      },
      borderRadius: {
        'xl': '12px',
        '2xl': '16px',
        '3xl': '24px',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-in': 'slideIn 0.25s ease-out',
      },
      keyframes: {
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp: { from: { opacity: '0', transform: 'translateY(12px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        slideIn: { from: { opacity: '0', transform: 'translateX(-12px)' }, to: { opacity: '1', transform: 'translateX(0)' } },
      },
    },
  },
  plugins: [],
}

export default config
