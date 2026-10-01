/**
 * @file source.config.ts
 * @description fumadocs-mdx collections. Loaded by `fumadocs-mdx/vite` at
 * build time (see vite.config.ts), which compiles every page and writes the
 * typed index to `.source/`.
 */
import { defineConfig, defineDocs, frontmatterSchema, metaSchema } from 'fumadocs-mdx/config';

export const docs = defineDocs({
  dir: './content/docs',
  docs: {
    schema: frontmatterSchema,
    postprocess: {
      // Embeds each page's processed Markdown in the bundle at build time, so
      // `page.data.getText('processed')` (llms-full.txt, the `.mdx` routes)
      // never needs a filesystem at request time.
      includeProcessedMarkdown: true,
    },
  },
  meta: {
    schema: metaSchema,
  },
});

export default defineConfig({
  mdxOptions: {
    remarkImageOptions: {
      // Remote images in the docs are left as plain URLs instead of being
      // fetched at build time to read their size.
      onError: 'ignore',
    },
  },
});
