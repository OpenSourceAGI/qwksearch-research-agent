import tailwindcssAnimate from 'tailwindcss-animate';

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class', "[class~='dark']"],
  safelist: [
    'dark',
    // Ensure Radix UI state variants are included
    {
      pattern: /^richtext-(animate|fade|zoom|slide)/,
      variants: ['data-[state=open]', 'data-[state=closed]', 'data-[side=top]', 'data-[side=bottom]', 'data-[side=left]', 'data-[side=right]'],
    },
  ],
  corePlugins: {
    preflight: false,
  },
  prefix: 'richtext-',

  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],

  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      colors: {
        border: 'hsl(var(--richtext-border))',
        input: 'hsl(var(--richtext-input))',
        ring: 'hsl(var(--richtext-ring))',
        background: 'hsl(var(--richtext-background))',
        foreground: 'hsl(var(--richtext-foreground))',
        primary: {
          DEFAULT: 'hsl(var(--richtext-primary))',
          foreground: 'hsl(var(--richtext-primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--richtext-secondary))',
          foreground: 'hsl(var(--richtext-secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--richtext-destructive))',
          foreground: 'hsl(var(--richtext-destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--richtext-muted))',
          foreground: 'hsl(var(--richtext-muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--richtext-accent))',
          foreground: 'hsl(var(--richtext-accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--richtext-popover))',
          foreground: 'hsl(var(--richtext-popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--richtext-card))',
          foreground: 'hsl(var(--richtext-card-foreground))',
        },
      },
      borderRadius: {
        xl: 'calc(var(--richtext-radius) + 4px)',
        lg: 'var(--richtext-radius)',
        md: 'calc(var(--richtext-radius) - 2px)',
        sm: 'calc(var(--richtext-radius) - 4px)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: 0 },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: 0 },
        },
        'collapsible-down': {
          from: { height: 0 },
          to: { height: 'var(--radix-collapsible-content-height)' },
        },
        'collapsible-up': {
          from: { height: 'var(--radix-collapsible-content-height)' },
          to: { height: 0 },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'collapsible-down': 'collapsible-down 0.2s ease-in-out',
        'collapsible-up': 'collapsible-up 0.2s ease-in-out',
        spin: 'spin 1s linear infinite',
      },
    },
  },
  plugins: [tailwindcssAnimate],
};
