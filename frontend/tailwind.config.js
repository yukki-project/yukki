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
        // UI-018a — les classes shadcn passent de `hsl(var(--xxx))`
        // à `var(--xxx)` brut puisque la palette canonique
        // (`palette.css`) expose des hex / rgba, et que les
        // variables shadcn (`globals.css` bloc `.dark`) sont
        // désormais des alias `var(--ykp-*)`.
        border: 'var(--border)',
        input: 'var(--input)',
        ring: 'var(--ring)',
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        primary: {
          DEFAULT: 'var(--primary)',
          foreground: 'var(--primary-foreground)',
        },
        secondary: {
          DEFAULT: 'var(--secondary)',
          foreground: 'var(--secondary-foreground)',
        },
        muted: {
          DEFAULT: 'var(--muted)',
          foreground: 'var(--muted-foreground)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          foreground: 'var(--accent-foreground)',
        },
        destructive: {
          DEFAULT: 'var(--destructive)',
          foreground: 'var(--destructive-foreground)',
        },
        card: {
          DEFAULT: 'var(--card)',
          foreground: 'var(--card-foreground)',
        },
        popover: {
          DEFAULT: 'var(--popover)',
          foreground: 'var(--popover-foreground)',
        },
        // UI-014a — SPDD editor tokens. Mirror values live in
        // `src/styles/spdd-tokens.css` (the .yk layer). These Tailwind
        // bindings let components use `bg-yk-bg-1`, `text-yk-primary`, etc.
        // UI-018a — la majorité des `--yk-*` sont aliasés sur la
        // palette canonique pour garantir la cohérence visuelle.
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
        // UI-018a — palette canonique yukki app-wide. Source de
        // vérité unique des couleurs (cf. `src/styles/palette.css`).
        // Consommée à terme par toute la chrome via UI-018b qui
        // remplacera `bg-background`, `text-foreground`, etc. par
        // leurs équivalents `bg-ykp-*`.
        ykp: {
          'bg-page': 'var(--ykp-bg-page)',
          'bg-elevated': 'var(--ykp-bg-elevated)',
          'bg-subtle': 'var(--ykp-bg-subtle)',
          'bg-input': 'var(--ykp-bg-input)',
          'bg-overlay': 'var(--ykp-bg-overlay)',
          line: 'var(--ykp-line)',
          'line-subtle': 'var(--ykp-line-subtle)',
          'line-strong': 'var(--ykp-line-strong)',
          'text-primary': 'var(--ykp-text-primary)',
          'text-secondary': 'var(--ykp-text-secondary)',
          'text-muted': 'var(--ykp-text-muted)',
          'text-faint': 'var(--ykp-text-faint)',
          primary: 'var(--ykp-primary)',
          'primary-fg': 'var(--ykp-primary-fg)',
          'primary-soft': 'var(--ykp-primary-soft)',
          'primary-soft-solid': 'var(--ykp-primary-soft-solid)',
          ring: 'var(--ykp-ring)',
          success: 'var(--ykp-success)',
          'success-soft': 'var(--ykp-success-soft)',
          'success-fg': 'var(--ykp-success-fg)',
          warning: 'var(--ykp-warning)',
          'warning-soft': 'var(--ykp-warning-soft)',
          'warning-fg': 'var(--ykp-warning-fg)',
          danger: 'var(--ykp-danger)',
          'danger-soft': 'var(--ykp-danger-soft)',
          'danger-fg': 'var(--ykp-danger-fg)',
          'code-key': 'var(--ykp-code-key)',
          'code-string': 'var(--ykp-code-string)',
          'code-heading': 'var(--ykp-code-heading)',
          'code-subheading': 'var(--ykp-code-subheading)',
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
