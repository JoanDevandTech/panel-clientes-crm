/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#7C3AED',
        secondary: '#D946EF',
        accent: '#06B6D4',
        'background-dark': '#0B061F',
        'surface-dark': '#150E2D',
        'bg-0': '#070414',
        'bg-1': '#0B061F',
        'bg-2': '#110829',
        'bg-3': '#1A0F3B',
        ink: '#F8F7FC',
        'ink-2': '#C8C3D9',
        'ink-3': '#8C87A0',
        portal: {
          bg: '#020617',
          'bg-2': '#0b1226',
          surface: 'rgba(15, 23, 42, 0.55)',
          'surface-glass': 'rgba(15, 23, 42, 0.38)',
          border: 'rgba(255, 255, 255, 0.07)',
          'border-strong': 'rgba(255, 255, 255, 0.14)',
          indigo: '#6366f1',
          'indigo-light': '#818cf8',
          cyan: '#22d3ee',
          purple: '#a855f7',
          text: '#f1f5f9',
          'text-2': '#cbd5e1',
          muted: '#94a3b8',
          dim: '#64748b',
        },
      },
      fontFamily: {
        display: ['Poppins', 'system-ui', 'sans-serif'],
        body: ['Lato', 'sans-serif'],
        portal: ['"Instrument Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      backdropBlur: {
        xs: '4px',
      },
      boxShadow: {
        'portal-card': '0 1px 2px rgba(0,0,0,.3), 0 8px 24px -12px rgba(0,0,0,.6)',
        'portal-pop': '0 24px 48px -24px rgba(0,0,0,.8), 0 4px 12px rgba(0,0,0,.35)',
        'portal-glow': '0 8px 28px -8px rgba(99, 102, 241, 0.55)',
      },
      backgroundImage: {
        'portal-grad': 'linear-gradient(90deg, #6366f1 0%, #22d3ee 100%)',
        'portal-grad-tri': 'linear-gradient(135deg, #6366f1 0%, #a855f7 50%, #22d3ee 100%)',
        'portal-button': 'linear-gradient(90deg, #6366f1, #a855f7)',
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
      },
      animation: {
        'fade-in': 'fade-in .4s ease-out both',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: 0, transform: 'translateY(4px)' },
          '100%': { opacity: 1, transform: 'none' },
        },
      },
    },
  },
  plugins: [],
}
