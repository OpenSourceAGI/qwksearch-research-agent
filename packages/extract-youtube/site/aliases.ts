/**
 * Points `extract-youtube`, `extract-youtube/react` and
 * `extract-youtube/library` at the package's TypeScript source (`../src`), so
 * the docs, the demo, the Worker and the stories build straight from the
 * package with no `dist/` build first — and an edit to a component shows up
 * on the next dev reload.
 *
 * Shared by `vite.config.ts` (the site and its Worker) and
 * `.storybook/vite.config.ts` (the stories), so both see the same code.
 */
import { fileURLToPath } from 'node:url';
import type { Alias } from 'vite';

const src = (path: string) => fileURLToPath(new URL(`../src/${path}`, import.meta.url));

export const extractYoutubeAliases: Alias[] = [
  { find: /^extract-youtube\/react$/, replacement: src('react/index.ts') },
  { find: /^extract-youtube\/library$/, replacement: src('library/index.ts') },
  { find: /^extract-youtube$/, replacement: src('index.ts') },
];

/** One React for the site and the aliased package source. */
export const dedupe = ['react', 'react-dom', 'lucide-react'];
