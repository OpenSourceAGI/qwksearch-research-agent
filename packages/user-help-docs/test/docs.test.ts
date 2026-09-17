/**
 * Integrity checks for the help site. These catch the failure modes that only
 * show up when the docs are rendered — a page that won't compile, a sidebar
 * entry pointing at a file nobody wrote, a link left behind by a rename — none
 * of which typechecking sees.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { icons } from 'lucide-react';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { docsConfig } from '../src/config';
import { getMDXComponents } from '../src/mdx-components';
import {
  getLLMFullText,
  getMarkdownParams,
  getMarkdownUrl,
  parseMarkdownSlug,
} from '../src/llms';
import { searchServer } from '../src/search';
import { source } from '../src/source';
import { helpDocsMdxPlugin } from '../src/vite';

/**
 * `src/source.ts` deliberately no longer exposes a filesystem path — it has to
 * run on a Cloudflare Worker, where there is none. These integrity checks do
 * run in Node, so they resolve `content/docs` themselves.
 */
const contentDir = fileURLToPath(new URL('../content/docs', import.meta.url));

const pages = source.getPages();

describe('content', () => {
  it('finds every page under content/docs', () => {
    const onDisk = fs
      .readdirSync(contentDir, { recursive: true, withFileTypes: true })
      .filter((entry) => entry.isFile() && /\.mdx?$/.test(entry.name)).length;

    expect(pages.length).toBe(onDisk);
  });

  it.each(pages.map((page) => [page.url, page] as const))('renders %s', (_url, page) => {
    // The body is compiled by `helpDocsMdxPlugin` during the build, so it is
    // already a component here — nothing compiles MDX at request time. See the
    // `worker compatibility` suite below for why that matters.
    expect(page.data.body).toBeTypeOf('function');

    const html = renderToStaticMarkup(
      createElement(page.data.body, { components: getMDXComponents() }),
    );

    // Every heading the outline links to has to exist in the body it came from
    // — a cheap way to say "this rendered the real page", not an empty shell.
    for (const item of page.data.toc) {
      expect(html, `${page.url} ${item.url}`).toContain(`id="${item.url.slice(1)}"`);
    }

    expect(html.length, page.url).toBeGreaterThan(0);
  });

  it('gives every page a table of contents built at compile time', () => {
    for (const page of pages) {
      expect(Array.isArray(page.data.toc), page.url).toBe(true);

      for (const item of page.data.toc) {
        expect(item.url, page.url).toMatch(/^#/);
        expect(item.depth, page.url).toBeGreaterThan(0);
      }
    }

    // Not every page has to have headings, but the whole set having none would
    // mean `rehypeToc` never ran.
    expect(pages.some((page) => page.data.toc.length > 0)).toBe(true);
  });

  it('gives every page a title and description', () => {
    for (const page of pages) {
      expect(page.data.title, page.url).toBeTruthy();
      expect(page.data.description, page.url).toBeTruthy();
    }
  });

  it('only uses icon names lucide-react actually exports', () => {
    // An unknown name is not an error — fumadocs logs a warning and renders
    // nothing — so nothing but this test would catch a typo.
    for (const page of pages) {
      const icon = (page.data as { icon?: string }).icon;
      if (icon) expect(Object.keys(icons), page.url).toContain(icon);
    }
  });
});

describe('sidebar', () => {
  it('references only files that exist', () => {
    const metaFiles = fs
      .readdirSync(contentDir, { recursive: true, withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name === 'meta.json');

    for (const entry of metaFiles) {
      const dir = entry.parentPath ?? contentDir;
      const meta = JSON.parse(fs.readFileSync(path.join(dir, entry.name), 'utf-8'));

      for (const item of meta.pages ?? []) {
        // `---Section---` entries are separators, not files.
        if (item.startsWith('---')) continue;

        const exists =
          fs.existsSync(path.join(dir, `${item}.mdx`)) ||
          fs.existsSync(path.join(dir, `${item}.md`)) ||
          fs.existsSync(path.join(dir, item));

        expect(exists, `${dir}/meta.json references "${item}"`).toBe(true);
      }
    }
  });

  it('lists every top-level page', () => {
    const meta = JSON.parse(fs.readFileSync(path.join(contentDir, 'meta.json'), 'utf-8'));
    const listed = new Set<string>(meta.pages);

    const topLevel = fs
      .readdirSync(contentDir, { withFileTypes: true })
      .filter((entry) => entry.isFile() && /\.mdx?$/.test(entry.name))
      .map((entry) => entry.name.replace(/\.mdx?$/, ''));

    for (const name of topLevel) expect(listed, `meta.json is missing "${name}"`).toContain(name);
  });
});

describe('links', () => {
  const urls = new Set(pages.map((page) => page.url));

  it('resolves every internal link', () => {
    const broken: string[] = [];

    for (const page of pages) {
      const body = page.data.content;

      for (const match of body.matchAll(/\]\((\/docs[^)\s#]*)(#[^)\s]*)?\)/g)) {
        if (!urls.has(match[1])) broken.push(`${page.url} -> ${match[1]}`);
      }

      for (const match of body.matchAll(/\]\((\.\.?\/[^)\s#]*)(#[^)\s]*)?\)/g)) {
        const dir = page.url.split('/').slice(0, -1).join('/');
        const resolved = new URL(match[1], `https://docs.invalid${dir}/`).pathname.replace(
          /\/$/,
          '',
        );

        if (!urls.has(resolved)) broken.push(`${page.url} -> ${match[1]} (${resolved})`);
      }
    }

    expect(broken).toEqual([]);
  });
});

describe('llms routes', () => {
  it('round-trips every markdown URL back to its page', () => {
    for (const page of pages) {
      const url = getMarkdownUrl(page);
      const slug = url.slice(`${docsConfig.baseUrl}/llms.mdx/`.length).split('/');

      expect(source.getPage(parseMarkdownSlug(slug))?.url, url).toBe(page.url);
    }
  });

  it('prerenders one markdown route per page', () => {
    expect(getMarkdownParams()).toHaveLength(pages.length);
  });

  it('includes every page in llms-full.txt', () => {
    const full = getLLMFullText();

    for (const page of pages) expect(full).toContain(`(${page.url})`);
  });
});

describe('search', () => {
  it('exports an index that returns hits', async () => {
    const response = await searchServer.staticGET();
    expect(response.ok).toBe(true);

    const results = await searchServer.search('pdf extraction');
    expect(results.length).toBeGreaterThan(0);
  });
});

describe('worker compatibility', () => {
  /**
   * `content/docs` used to be scanned with `node:fs` at module scope, off a
   * directory resolved with `fileURLToPath(import.meta.url)`. In the Cloudflare
   * Worker bundle `import.meta.url` is undefined, so importing the module threw
   * `TypeError: The "path" argument must be of type string or an instance of
   * URL` before any request handler ran — 500ing `/docs` and every other route
   * that shared the chunk.
   */
  it('builds the source without importing node builtins', () => {
    const src = fs.readFileSync(
      fileURLToPath(new URL('../src/source.ts', import.meta.url)),
      'utf-8',
    );

    const builtins = [...src.matchAll(/^\s*import\s[^;]*?from\s+'(node:[^']+|fs|path|url)'/gm)].map(
      (match) => match[1],
    );

    expect(builtins).toEqual([]);
  });

  /**
   * The bug this guards against: `/docs` compiled its MDX per request with
   * `@fumadocs/mdx-remote`, whose renderer does
   *
   *   new AsyncFunction(...Object.keys(scope), compiled)
   *
   * Cloudflare Workers refuse to generate code from strings, so every request
   * died with `EvalError: Code generation from strings disallowed for this
   * context` — a 500 on every docs page in production, while this suite stayed
   * green because Node allows `new Function`. The MDX is now compiled by the
   * bundler (`src/vite.ts`), so nothing on the request path evaluates source.
   */
  it('keeps the eval-based MDX renderer off the request path', () => {
    const srcDir = fileURLToPath(new URL('../src', import.meta.url));

    const offenders = fs
      .readdirSync(srcDir, { recursive: true, withFileTypes: true })
      .filter((entry) => entry.isFile() && /\.tsx?$/.test(entry.name))
      // `src/vite.ts` is bundler-side config, never shipped to the Worker.
      .filter((entry) => entry.name !== 'vite.ts')
      .filter((entry) => {
        const source = fs
          .readFileSync(path.join(entry.parentPath ?? srcDir, entry.name), 'utf-8')
          // Several of these files explain the bug in prose; only code counts.
          .replace(/\/\*[\s\S]*?\*\//g, '')
          .replace(/(^|\s)\/\/.*$/gm, '$1');

        return (
          source.includes('@fumadocs/mdx-remote') ||
          /\bnew\s+(?:Async)?Function\s*\(/.test(source) ||
          /(?:^|[^.\w])eval\s*\(/.test(source)
        );
      })
      .map((entry) => entry.name);

    expect(offenders).toEqual([]);
  });

  /**
   * vinext auto-injects its own `@mdx-js/rollup` unless it finds a plugin by
   * that name (or `mdx`) already registered. Renaming ours puts two MDX
   * compilers in the chain, and the second one chokes on the first one's
   * output: "Unexpected `FunctionDeclaration` in code: only import/exports are
   * supported", once per page, failing the app build.
   */
  it('keeps the plugin name vinext looks for', () => {
    expect(helpDocsMdxPlugin().name).toBe('@mdx-js/rollup');
  });

  it('inlines every content file at build time', () => {
    const onDisk = fs
      .readdirSync(contentDir, { recursive: true, withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name === 'meta.json').length;

    // One page tree root per meta.json, and the pages themselves are covered
    // by the `content` suite above.
    expect(source.pageTree.children.length).toBeGreaterThan(0);
    expect(onDisk).toBeGreaterThan(0);
  });
});

describe('landing page', () => {
  const landing = pages.find((page) => page.url === docsConfig.baseUrl);

  /** The index rendered through the same component map the route uses. */
  const html = () =>
    renderToStaticMarkup(
      createElement(landing!.data.body, { components: getMDXComponents() }),
    );

  it('is served at the docs root', () => {
    expect(landing).toBeDefined();
  });

  it('opens with the hero, not with prose', () => {
    // The route drops its own title and breadcrumb for this page (see the
    // `isLandingPage` branch in `app/docs/[[...slug]]/page.tsx`), so the hero
    // is the only thing carrying the `<h1>`. Losing it leaves the front door
    // with no heading at all.
    const markup = html();

    expect(markup).toContain('<h1');
    expect(markup).toContain('Open-source research agent');
    expect(markup).toContain('Search 100+ sites');
  });

  it('links its calls to action somewhere real', () => {
    const markup = html();

    expect(markup).toContain('href="/docs/quickstart"');
    expect(markup).toContain('href="https://qwksearch.com"');
    // External links open in a new tab without handing the opener over.
    expect(markup).toContain('rel="noreferrer noopener"');
  });

  it('renders the feature grid and the highlight rows as real markup', () => {
    // An MDX component that resolved to nothing would still render the page,
    // just empty — assert on what each one actually draws.
    const markup = html();

    for (const href of ['/docs/quickstart', '/docs/search', '/docs/reader', '/docs/api']) {
      expect(markup, href).toContain(`href="${href}"`);
    }

    expect(markup).toContain('Full-text grounding');
    expect(markup).toContain('Real citations');
    // The highlights replaced a header-less Markdown table, which is exactly
    // what should not come back.
    expect(markup).not.toContain('<table');
  });
})
