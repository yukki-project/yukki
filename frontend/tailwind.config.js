/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: { '2xl': '1400px' },
    },
    extend: {
      spacing: {
        13: '3.25rem',
      },
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        // UI-014a — SPDD editor tokens. Mirror values live in
        // `src/styles/spdd-tokens.css` (the .yk layer). These Tailwind
        // bindings let components use `bg-yk-bg-1`, `text-yk-primary`, etc.
        yk: {
          'bg-page': 'var(--yk-bg-page)',
          'bg-1': 'var(--yk-bg-1)',
          'bg-2': 'var(--yk-bg-2)',
          'bg-3': 'var(--yk-bg-3)',
          'bg-elev': 'var(--yk-bg-elev)',
          'bg-input': 'var(--yk-bg-input)',
          line: 'var(--yk-line)',
          'line-subtle': 'var(--yk-line-subtle)',
          'line-strong': 'var(--yk-line-strong)',
          'text-primary': 'var(--yk-text-primary)',
          'text-secondary': 'var(--yk-text-secondary)',
          'text-muted': 'var(--yk-text-muted)',
          'text-faint': 'var(--yk-text-faint)',
          primary: 'var(--yk-primary)',
          'primary-soft': 'var(--yk-primary-soft)',
          'primary-ring': 'var(--yk-primary-ring)',
          success: 'var(--yk-success)',
          'success-soft': 'var(--yk-success-soft)',
          warning: 'var(--yk-warning)',
          'warning-soft': 'var(--yk-warning-soft)',
          danger: 'var(--yk-danger)',
          'danger-soft': 'var(--yk-danger-soft)',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
        'yk-sm': 'var(--yk-radius-sm)',
        yk: 'var(--yk-radius)',
        'yk-md': 'var(--yk-radius-md)',
        'yk-lg': 'var(--yk-radius-lg)',
      },
      fontFamily: {
        inter: ['Inter', 'system-ui', 'sans-serif'],
        jbmono: ['"JetBrains Mono"', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [require('tailwindcss-animate'), require('@tailwindcss/typography')],
};
