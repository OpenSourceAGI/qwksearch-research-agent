/**
 * @file source.tsx
 * @description Fumadocs source loader. `fumadocs-mdx:collections/server` is
 * the index `fumadocs-mdx/vite` generates in `.source/` at build time; every
 * page body in it is already-compiled JS, so nothing here touches a
 * filesystem or compiles MDX at request time (both impossible on Workers).
 */
import { docs } from 'fumadocs-mdx:collections/server';
import { type InferMetaType, type InferPageType, type LoaderPlugin, loader } from 'fumadocs-core/source';
import { lucideIconsPlugin } from 'fumadocs-core/source/lucide-icons';

export const source = loader({
  baseUrl: '/docs',
  plugins: [pageTreeCodeTitles(), lucideIconsPlugin()],
  source: docs.toFumadocsSource(),
});

/** Renders sidebar entries named like `fetch()` or `<VideoGrid />` as code. */
function pageTreeCodeTitles(): LoaderPlugin {
  return {
    transformPageTree: {
      file(node) {
        if (typeof node.name === 'string' && (node.name.endsWith('()') || node.name.match(/^<\w+ \/>$/))) {
          return {
            ...node,
            name: <code className="text-[0.8125rem]">{node.name}</code>,
          };
        }
        return node;
      },
    },
  };
}

/**
 * A page as plain Markdown for LLMs. `processed` is embedded at build time
 * (`includeProcessedMarkdown` in source.config.ts) — the `raw` variant would
 * read the file from disk, which a Worker cannot do.
 */
export async function getLLMText(page: InferPageType<typeof source>) {
  const processed = await page.data.getText('processed');

  return `# ${page.data.title} (${page.url})

${processed}`;
}

export type Page = InferPageType<typeof source>;
export type Meta = InferMetaType<typeof source>;
