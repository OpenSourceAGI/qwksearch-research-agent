/**
 * Module aliases for the site, shared by the Worker build and `vinext dev`.
 *
 * - `extract-pdf`, `extract-webpage` and `extract-youtube` (which
 *   extract-webpage uses for YouTube URLs) resolve to the packages' own
 *   TypeScript source, so the demo always runs the code in this repo with no
 *   package build first.
 * - extract-pdf's optional engines that cannot run on Workers (LiteParse's
 *   native addon, Granite Docling through transformers.js, @napi-rs/canvas)
 *   resolve to `worker/unsupported.ts`, which throws when imported. Every one
 *   of them is behind a dynamic `import()`, so this keeps them out of the
 *   bundle and turns selecting one into a clear error.
 */
import { fileURLToPath } from 'node:url';
import type { Alias } from 'vite';

const here = (path: string) => fileURLToPath(new URL(path, import.meta.url));
const unsupported = here('./worker/unsupported.ts');

export const aliases: Alias[] = [
  { find: /^extract-pdf$/, replacement: here('../src/pdf-to-html.ts') },
  { find: /^extract-webpage\/(.*)$/, replacement: `${here('../../extract-webpage/src')}/$1` },
  { find: /^extract-webpage$/, replacement: here('../../extract-webpage/src/index.ts') },
  { find: /^extract-youtube$/, replacement: here('../../extract-youtube/src/index.ts') },
  { find: /^@llamaindex\/liteparse(-wasm)?$/, replacement: unsupported },
  { find: /^@huggingface\/transformers$/, replacement: unsupported },
  { find: /^@napi-rs\/canvas$/, replacement: unsupported },
];

/** One React for the site and the aliased package source. */
export const dedupe = ['react', 'react-dom'];
