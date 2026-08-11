import tailwindcssAnimate from 'tailwindcss-animate';

/**
 * Reads a `--richtext-*` design token (see `src/styles/global.scss`) as a
 * complete colour rather than the bare `H S L` triplet shadcn v3 assumes.
 *
 * The tokens alias the host application's own theme variables, and a host is
 * free to express its palette in any colour space — this product uses
 * `oklch()` — so the old `hsl(var(--token))` wrapper would produce an invalid
 * declaration and the editor would fall back to unstyled white. Reading the
 * token directly works whatever colour space the host themes in.
 *
 * Tailwind calls this with an explicit `opacityValue` for opacity modifiers
 * (`bg-primary/90`), which `color-mix()` applies to the opaque token — what
 * the `hsl(… / α)` slash syntax used to do. Without a modifier it instead
 * threads its own `--tw-*-opacity` variable through `opacityVariable` (and
 * pins it to 1 on the same rule), so the token is emitted unwrapped.
 *
 * @param {string} token CSS custom property name, e.g. `--richtext-primary`.
 */
const themeColor = (token) => ({ opacityValue, opacityVariable } = {}) =>
  opacityValue === undefined || opacityVariable !== undefined
    ? `var(${token})`
    : `color-mix(in oklab, var(${token}) calc(${opacityValue} * 100%), transparent)`;

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
        border: themeColor('--richtext-border'),
        input: themeColor('--richtext-input'),
        ring: themeColor('--richtext-ring'),
        background: themeColor('--richtext-background'),
        foreground: themeColor('--richtext-foreground'),
        primary: {
          DEFAULT: themeColor('--richtext-primary'),
          foreground: themeColor('--richtext-primary-foreground'),
        },
        secondary: {
          DEFAULT: themeColor('--richtext-secondary'),
          foreground: themeColor('--richtext-secondary-foreground'),
        },
        destructive: {
          DEFAULT: themeColor('--richtext-destructive'),
          foreground: themeColor('--richtext-destructive-foreground'),
        },
        muted: {
          DEFAULT: themeColor('--richtext-muted'),
          foreground: themeColor('--richtext-muted-foreground'),
        },
        accent: {
          DEFAULT: themeColor('--richtext-accent'),
          foreground: themeColor('--richtext-accent-foreground'),
        },
        popover: {
          DEFAULT: themeColor('--richtext-popover'),
          foreground: themeColor('--richtext-popover-foreground'),
        },
        card: {
          DEFAULT: themeColor('--richtext-card'),
          foreground: themeColor('--richtext-card-foreground'),
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
