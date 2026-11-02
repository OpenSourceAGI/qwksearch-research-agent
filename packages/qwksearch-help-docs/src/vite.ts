/**
 * @file vite.ts
 * @description The bundler half of the docs pipeline: a Vite plugin that
 * compiles `content/docs` MDX into JavaScript modules at build time.
 *
 * The docs used to be compiled per request with `@fumadocs/mdx-remote`, whose
 * renderer instantiates the compiled module with `new AsyncFunction(...)`.
 * Cloudflare Workers forbid runtime code generation, so once deployed every
 * `/docs` request 500'd with
 *
 *   EvalError: Code generation from strings disallowed for this context
 *
 * while every test stayed green under Node, where `new Function` is allowed.
 * Compiling in the bundler removes the eval: `src/source.ts` imports the
 * compiled modules through `import.meta.glob`, so a page body reaches the
 * Worker as ordinary bundled code.
 *
 * Any app mounting these docs has to register this plugin — in its Vite build
 * *and* in its Vitest config, since both resolve the same glob.
 */
import mdxRollup from '@mdx-js/rollup';
import {
  rehypeCode,
  rehypeToc,
  remarkCodeTab,
  remarkGfm,
  remarkHeading,
  remarkImage,
  remarkNpm,
} from 'fumadocs-core/mdx-plugins';
import remarkFrontmatter from 'remark-frontmatter';
import type { Plugin } from 'vite';

/** Vite's "give me this file as a string" query, in any position. */
const RAW_QUERY = /[?&]raw(?:&|$)/;

/**
 * Compiles `.md`/`.mdx` imports with the plugin set Fumadocs applies to its own
 * content, so a rendered page keeps its heading anchors, Shiki code blocks and
 * GFM tables.
 *
 * `?raw` imports are skipped, which is what keeps the raw-text half of
 * `source.ts` (the search index and the `llms.mdx` views) reading the original
 * Markdown. `@mdx-js/rollup` strips the query before matching its own filter,
 * so it would otherwise compile Vite's `export default "…"` wrapper as MDX and
 * hand back a component where a string was asked for.
 */
export function helpDocsMdxPlugin(): Plugin {
  const plugin = mdxRollup({
    remarkPlugins: [
      // Frontmatter is parsed from the raw source in `source.ts`; here it only
      // has to stay out of the rendered body.
      remarkFrontmatter,
      remarkGfm,
      remarkHeading,
      // `useImport: false` keeps image sources plain URLs rather than bundler
      // imports — the docs reference files served from `public/`.
      [remarkImage, { useImport: false }],
      remarkCodeTab,
      remarkNpm,
    ],
    // `rehypeToc` adds the `toc` export that `DocsPage` renders as the on-page
    // outline.
    rehypePlugins: [rehypeCode, rehypeToc],
  }) as Plugin;

  const transform = plugin.transform;
  const handler = typeof transform === 'function' ? transform : transform?.handler;

  return {
    // The spread carries `@mdx-js/rollup`'s own plugin name through, and it has
    // to: vinext looks for a plugin called that (or `mdx`) to decide whether to
    // auto-inject its own bare MDX plugin, and a second one would try to
    // re-compile this one's JavaScript output — "Unexpected
    // `FunctionDeclaration` in code: only import/exports are supported", once
    // per page. `test/docs.test.ts` holds that name.
    ...plugin,
    // Ahead of Vite's own transforms, none of which can parse MDX.
    enforce: 'pre',
    transform(code, id, options) {
      if (RAW_QUERY.test(id)) return null;

      return handler?.call(this, code, id, options) ?? null;
    },
  };
}
