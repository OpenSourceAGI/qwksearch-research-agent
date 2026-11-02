/// <reference path="./import-meta-glob.d.ts" />
/**
 * Fumadocs source for the help docs.
 *
 * The content is inlined at build time with `import.meta.glob` instead of the
 * `fumadocs-mdx` build-time collections pipeline, so this package needs no
 * codegen step wired into the consuming app's bundler.
 *
 * It is inlined rather than read off disk because the consuming app
 * (`apps/qwksearch-web`) ships to a Cloudflare Worker: there is no filesystem
 * to scan there, and no `import.meta.url` to resolve `content/docs` against.
 * Resolving one anyway threw at module scope —
 *
 *   TypeError: The "path" argument must be of type string or an instance of
 *   URL. Received undefined
 *       at fileURLToPath (node-internal:internal_url)
 *
 * — which took down every route bundled into the same chunk, not just `/docs`.
 *
 * Each file is inlined twice, because the two halves of the site need it in
 * different shapes:
 *
 *   * `?raw`, as the original Markdown, for the search index (`search.ts`) and
 *     the plain-text `llms.mdx` views (`llms.ts`); and
 *   * compiled, as a React component, for the rendered page. That compile
 *     happens in the bundler (`helpDocsMdxPlugin`, see `vite.ts`) rather than
 *     per request, because the request-time compiler ran the compiled module
 *     through `new AsyncFunction(...)` and Cloudflare Workers forbid runtime
 *     code generation:
 *
 *       EvalError: Code generation from strings disallowed for this context
 *
 *     which 500'd every `/docs` request in production while Node-hosted tests
 *     kept passing.
 */
import { frontmatter as parseFrontmatter } from 'fumadocs-core/content/md/frontmatter';
import { loader, type MetaData } from 'fumadocs-core/source';
import { lucideIconsPlugin } from 'fumadocs-core/source/plugins/lucide-icons';
import type { TableOfContents } from 'fumadocs-core/toc';
import type { FC } from 'react';

import { docsConfig } from './config';

/** Prefix the glob keys carry: `content/docs`, relative to this file. */
const GLOB_PREFIX = '../content/docs/';

/** Repo-relative root of the shipped content, used for `absolutePath`. */
const CONTENT_ROOT = docsConfig.githubEdit.pathPrefix;

/**
 * Every `content/docs` file as a string, keyed by its path relative to this
 * module. Eager so `source` stays synchronous for the consuming layout.
 */
const rawFiles = import.meta.glob('../content/docs/**/*.{md,mdx,json}', {
  query: '?raw',
  import: 'default',
  eager: true,
});

/** A page's renderable body: the default export of a compiled MDX module. */
export type HelpDocBody = FC<{ components?: Record<string, unknown> }>;

/** What `helpDocsMdxPlugin` turns each `.md`/`.mdx` file into. */
interface CompiledDoc {
  default: HelpDocBody;
  /** Contributed by Fumadocs' `rehypeToc`. */
  toc?: TableOfContents;
}

/**
 * The same files again, compiled to modules by the bundler. Eager for the same
 * reason as `rawFiles`, and so the Worker never has to resolve a chunk at
 * request time.
 */
const compiledFiles = import.meta.glob<CompiledDoc>('../content/docs/**/*.{md,mdx}', {
  eager: true,
});

export interface HelpDocPageData {
  title: string;
  description?: string;
  icon?: string;
  /** Render the page edge-to-edge, without a table of contents gutter. */
  full?: boolean;
  /** Raw MDX body (frontmatter stripped), used for search and the LLM views. */
  content: string;
  /** The compiled body, ready to render — no request-time MDX compile. */
  body: HelpDocBody;
  /** Headings collected while compiling, for the on-page outline. */
  toc: TableOfContents;
}

type HelpDocFile =
  | { type: 'page'; path: string; absolutePath: string; data: HelpDocPageData }
  | { type: 'meta'; path: string; absolutePath: string; data: MetaData };

function collectFiles(): HelpDocFile[] {
  const files: HelpDocFile[] = [];

  // Sorted so the page tree is built in the same order on every machine,
  // whatever order the bundler happens to hand the glob keys back in.
  for (const key of Object.keys(rawFiles).sort()) {
    if (!key.startsWith(GLOB_PREFIX)) continue;

    const relativePath = key.slice(GLOB_PREFIX.length);
    const absolutePath = `${CONTENT_ROOT}/${relativePath}`;
    const name = relativePath.slice(relativePath.lastIndexOf('/') + 1);
    const raw = rawFiles[key];

    if (name === 'meta.json') {
      files.push({
        type: 'meta',
        path: relativePath,
        absolutePath,
        data: JSON.parse(raw) as MetaData,
      });
      continue;
    }

    if (!/\.mdx?$/.test(name)) continue;

    const compiled = compiledFiles[key];

    // The two globs cover the same extensions, so a page without a compiled
    // module means the bundler ran without `helpDocsMdxPlugin` — better to say
    // so here than to render `undefined` as a component.
    if (!compiled) {
      throw new Error(
        `No compiled module for "${relativePath}". The host app must register ` +
          `helpDocsMdxPlugin() from "user-help-docs/vite" in its Vite and Vitest configs.`,
      );
    }

    const { data: frontmatter, content } = parseFrontmatter(raw);
    const data = frontmatter as {
      title?: string;
      description?: string;
      icon?: string;
      full?: boolean;
    };

    files.push({
      type: 'page',
      path: relativePath,
      absolutePath,
      data: {
        title: data.title ?? name.replace(/\.mdx?$/, ''),
        description: data.description,
        icon: data.icon,
        full: data.full,
        content,
        body: compiled.default,
        toc: compiled.toc ?? [],
      },
    });
  }

  return files;
}

export const source = loader(
  { files: collectFiles() },
  {
    baseUrl: docsConfig.baseUrl,
    // Frontmatter `icon: "Search"` becomes the matching Lucide icon in the
    // sidebar and page tree.
    plugins: [lucideIconsPlugin()],
  },
);

export type HelpDocPage = ReturnType<typeof source.getPages>[number];
