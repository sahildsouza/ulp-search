/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    screens: {
      'xs': '480px',
      'sm': '640px',
      'md': '768px',
      'lg': '1024px',
      'xl': '1280px',
      '2xl': '1536px',
    },
    extend: {
      colors: {
        oled: '#000000',
        obsidian: {
          DEFAULT: '#080C14',
          50: '#141D2E',
          100: '#101726',
          200: '#0C121E',
          300: '#080C14',
          400: '#05080E',
        },
        brand: {
          cyan: '#06B6D4',
          emerald: '#10B981',
          yellow: '#F59E0B',
          crimson: '#EF4444',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow-cyan': 'glowCyan 2s ease-in-out infinite alternate',
      },
      keyframes: {
        glowCyan: {
          '0%': { boxShadow: '0 0 5px rgba(6, 182, 212, 0.2)' },
          '100%': { boxShadow: '0 0 18px rgba(6, 182, 212, 0.6)' },
        }
      }
    },
  },
  plugins: [],
}
