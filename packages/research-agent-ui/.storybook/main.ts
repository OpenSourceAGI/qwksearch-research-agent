import { fileURLToPath } from 'node:url';
import type { StorybookConfig } from '@storybook/react-vite';

/**
 * Storybook configuration for the research-agent-ui component library.
 *
 * Stories live next to the components they demo (`src/**\/*.stories.tsx`) and
 * render against mock data only — no live API, auth, or chat backend is
 * required, so the whole design system can be browsed in isolation.
 */
const config: StorybookConfig = {
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(ts|tsx)'],
  addons: [],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  core: {
    disableTelemetry: true,
  },
  // Tailwind v4 is applied through its official Vite plugin so the design
  // tokens in `.storybook/preview.css` (mirrored from the host app's
  // globals.css) resolve exactly as they do in production.
  viteFinal: async (viteConfig) => {
    const { default: tailwindcss } = await import('@tailwindcss/vite');
    viteConfig.plugins = viteConfig.plugins ?? [];
    viteConfig.plugins.push(tailwindcss());

    // Stories render outside a Next.js app, so alias `next/link` to a plain
    // anchor stub. This lets presentational components that use it (e.g.
    // Footer, HistoryChatItem) render in isolation without an App Router.
    viteConfig.resolve = viteConfig.resolve ?? {};
    viteConfig.resolve.alias = {
      ...(viteConfig.resolve.alias ?? {}),
      'next/link': fileURLToPath(new URL('./next-link-stub.tsx', import.meta.url)),
    };

    return viteConfig;
  },
};

export default config;
