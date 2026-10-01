import type { StorybookConfig } from '@storybook/react-vite';

/**
 * Storybook for extract-youtube's React components: one story file per
 * component under `stories/`, each with a docs page (autodocs) built from the
 * component's props and the descriptions in the story file.
 *
 * `bun run build-storybook` writes it into `dist/client/storybook`, so the
 * demo Worker's deploy serves it at `/storybook/` beside the live app. Every
 * story runs on in-memory data (`createLocalLibraryClient` over a memory
 * store, the `SAMPLE_SNIPPETS` transcript), so no API has to be up.
 */
const config: StorybookConfig = {
  stories: ['../stories/**/*.mdx', '../stories/**/*.stories.@(ts|tsx)'],
  addons: ['@storybook/addon-docs'],
  framework: {
    name: '@storybook/react-vite',
    options: { builder: { viteConfigPath: '.storybook/vite.config.ts' } },
  },
  core: { disableTelemetry: true },
  docs: { defaultName: 'Docs' },
};

export default config;
