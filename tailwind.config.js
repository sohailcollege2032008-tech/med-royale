/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#0A0E1A',
        primary: '#00F5A0',
        secondary: '#00D4FF',
        warning: '#FFB800',
        choice: {
          A: '#FF6B6B',
          B: '#4ECDC4',
          C: '#FFE66D',
          D: '#A78BFA'
        }
      },
      fontFamily: {
        sans: ['Cairo', 'sans-serif'],
        display: ['Clash Display', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      }
    },
  },
  plugins: [],
}
