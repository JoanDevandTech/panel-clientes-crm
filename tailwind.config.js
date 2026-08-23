/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Acento único de Krom: cian. `secondary` queda como el hover del cian
        // para que cualquier degradado heredado `from-primary to-secondary`
        // siga leyéndose como cian y no como el morado del branding anterior.
        primary: '#00E5FF',
        secondary: '#7FF0FF',
        accent: '#00E5FF',
        danger: '#FF1744',

        // Superficies Krom
        'background-dark': '#0D0E11',
        'surface-dark': '#101218',
        'bg-0': '#0D0E11',
        'bg-1': '#111319',
        'bg-2': '#15171D',
        'bg-3': '#101218',

        // Escala de texto rgba(248,249,250,α)
        ink: '#F8F9FA',
        'ink-2': 'rgba(248, 249, 250, 0.72)',
        'ink-3': 'rgba(248, 249, 250, 0.45)',

        portal: {
          bg: '#0D0E11',
          surface: '#111319',
          'surface-alt': '#15171D',
          card: '#101218',
          border: 'rgba(248, 249, 250, 0.09)',
          'border-strong': 'rgba(248, 249, 250, 0.16)',
          cyan: '#00E5FF',
          'cyan-hover': '#7FF0FF',
          red: '#FF1744',
          text: '#F8F9FA',
          'text-2': 'rgba(248, 249, 250, 0.72)',
          muted: 'rgba(248, 249, 250, 0.55)',
          dim: 'rgba(248, 249, 250, 0.45)',
          faint: 'rgba(248, 249, 250, 0.34)',
        },
      },
      fontFamily: {
        sans: ['"IBM Plex Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Space Grotesk"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        body: ['"IBM Plex Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        portal: ['"IBM Plex Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      letterSpacing: {
        kicker: '0.22em',
        brand: '0.2em',
      },
      backdropBlur: {
        xs: '4px',
      },
      boxShadow: {
        'portal-card': '0 1px 2px rgba(0,0,0,.3), 0 8px 24px -12px rgba(0,0,0,.6)',
        'portal-pop': '0 24px 48px -24px rgba(0,0,0,.8), 0 4px 12px rgba(0,0,0,.35)',
        'portal-glow': '0 0 40px rgba(0, 229, 255, 0.28)',
      },
      backgroundImage: {
        // Krom no usa degradados de marca: los "grad" quedan planos en cian.
        'portal-grad': 'linear-gradient(90deg, #00E5FF 0%, #00E5FF 100%)',
        'portal-grad-tri': 'linear-gradient(135deg, #00E5FF 0%, #00E5FF 100%)',
        'portal-button': 'linear-gradient(90deg, #00E5FF, #00E5FF)',
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        // Rejilla técnica Krom
        'krom-grid':
          'linear-gradient(rgba(0,229,255,.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0,229,255,.05) 1px, transparent 1px)',
      },
      backgroundSize: {
        'krom-grid': '72px 72px',
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
