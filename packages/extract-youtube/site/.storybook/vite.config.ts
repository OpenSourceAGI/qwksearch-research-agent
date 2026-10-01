/**
 * Storybook's Vite config. Deliberately not the app's `vite.config.ts`: that
 * one adds `@cloudflare/vite-plugin`, which would try to build the Worker
 * inside Storybook. Stories need only React and the source aliases.
 */
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

import { dedupe, extractYoutubeAliases } from '../aliases.ts';

export default defineConfig({
  plugins: [react()],
  resolve: { alias: extractYoutubeAliases, dedupe },
});
