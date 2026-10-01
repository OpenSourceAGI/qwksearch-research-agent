/**
 * Points `extract-youtube`, `extract-youtube/react` and
 * `extract-youtube/library` at the package's TypeScript source, so the demo,
 * the Worker and the stories build straight from `packages/extract-youtube/src`
 * with no `dist/` build first — and an edit to a component shows up in the
 * next dev reload.
 *
 * Shared by `vite.config.ts` (the app and the Worker) and
 * `.storybook/vite.config.ts` (the stories), so all three see the same code.
 */
import { fileURLToPath } from 'node:url';
import type { Alias } from 'vite';

const src = (path: string) => fileURLToPath(new URL(`../../packages/extract-youtube/src/${path}`, import.meta.url));

export const extractYoutubeAliases: Alias[] = [
  { find: /^extract-youtube\/react$/, replacement: src('react/index.ts') },
  { find: /^extract-youtube\/library$/, replacement: src('library/index.ts') },
  { find: /^extract-youtube$/, replacement: src('index.ts') },
];

/** One React for the app and the aliased package source. */
export const dedupe = ['react', 'react-dom', 'lucide-react'];
