/**
 * @file llms.ts
 * @description Plain-text renderings of the docs for LLM consumers — the
 * `.mdx` view of a single page and the `llms-full.txt` dump of every page.
 */
import { docsConfig } from './config';
import { source, type HelpDocPage, type HelpDocPageData } from './source';

/** Slug of a page relative to the docs root; the index page has an empty one. */
function pageSlug(page: HelpDocPage): string[] {
  return page.url
    .slice(docsConfig.baseUrl.length)
    .split('/')
    .filter(Boolean);
}

/**
 * URL serving a page's raw Markdown, e.g. `/docs/llms.mdx/features.mdx`. The
 * trailing extension is what makes the copied/downloaded file land as Markdown.
 */
export function getMarkdownUrl(page: HelpDocPage): string {
  const slug = pageSlug(page);
  const path = slug.length > 0 ? slug.join('/') : 'index';

  return `${docsConfig.baseUrl}/llms.mdx/${path}.mdx`;
}

/** URL of a page's source file on GitHub. */
export function getGithubUrl(page: HelpDocPage): string {
  return `${docsConfig.githubDocs}/${page.path}`;
}

/**
 * Reverse of {@link getMarkdownUrl}: turn the route's slug back into the slug
 * `source.getPage` expects. `undefined` and `['index']` both mean the root.
 */
export function parseMarkdownSlug(slug: string[] | undefined): string[] {
  if (!slug || slug.length === 0) return [];

  const parsed = [...slug];
  parsed[parsed.length - 1] = parsed[parsed.length - 1].replace(/\.mdx$/, '');

  return parsed.length === 1 && parsed[0] === 'index' ? [] : parsed;
}

/** Every page's markdown route params, for `generateStaticParams`. */
export function getMarkdownParams(): { slug: string[] }[] {
  return source.getPages().map((page) => {
    const slug = pageSlug(page);
    const path = slug.length > 0 ? [...slug] : ['index'];
    path[path.length - 1] = `${path[path.length - 1]}.mdx`;

    return { slug: path };
  });
}

/** A single page as Markdown, prefixed with its title and canonical URL. */
export function getLLMText(page: HelpDocPage): string {
  const data = page.data as HelpDocPageData;

  return `# ${data.title} (${page.url})

${data.description ? `${data.description}\n\n` : ''}${data.content}`;
}

/** Every page concatenated, for `${baseUrl}/llms-full.txt`. */
export function getLLMFullText(): string {
  const header = `# ${docsConfig.title}\n\n> ${docsConfig.description}\n`;

  return [header, ...source.getPages().map(getLLMText)].join('\n\n');
}
