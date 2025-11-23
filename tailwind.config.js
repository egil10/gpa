/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        grok: {
          bg: '#000000',
          surface: '#0a0a0a',
          'surface-2': '#111111',
          border: '#1f1f1f',
          'text-primary': '#e4e4e7',
          'text-secondary': '#a1a1aa',
          'text-muted': '#52525b',
          blue: '#00d4ff',
          'blue-hover': '#00e7ff',
          orange: '#ff6b35',
          green: '#00ff9d',
        }
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        heading: ['var(--font-space)', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'grok-gradient': 'linear-gradient(135deg, #0a0a0a 0%, #000000 70%)',
      },
      animation: {
        'fade-up': 'fadeUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'bounce-slow': 'bounce 1.4s infinite',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}

