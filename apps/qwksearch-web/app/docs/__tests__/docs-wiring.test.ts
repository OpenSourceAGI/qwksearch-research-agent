/**
 * The /docs help site is assembled from two halves that nothing else checks
 * against each other: the content and the Fumadocs UI live in
 * `packages/user-help-docs`, while the routes that mount them live here.
 * That package has its own suite for the content itself; this one covers
 * the seam, which fails silently rather than at build time — a moved route
 * file, a `docsConfig` value the routes no longer match, a dropped
 * `transpilePackages` entry or a missing CSS import all yield a 404, an
 * unstyled page or an empty sidebar with a green build. No CI job builds
 * this app, so this suite is the only thing standing between a broken
 * /docs and a deploy.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';
import { build } from 'vite';

import { source } from 'user-help-docs';
import { docsConfig } from 'user-help-docs/config';

/** `apps/qwksearch-web`, resolved from this file. */
const appDir = fileURLToPath(new URL('../../..', import.meta.url));

function readAppFile(...segments: string[]): string {
  return fs.readFileSync(path.join(appDir, ...segments), 'utf8');
}

/** Turn a route like `/docs/api/docs-search` into its `app/` directory. */
function routeDir(route: string): string {
  return path.join(appDir, 'app', route.replace(/^\//, ''));
}

describe('the docs package loads', () => {
  it('inlines every content page into the bundle', () => {
    // `user-help-docs` builds its page tree with `import.meta.glob`, which
    // only exists under a Vite-based bundler. If this app ever compiles it
    // with something else, an empty page list is where that shows up.
    expect(source.getPages().length).toBeGreaterThan(0);
  });

  it('compiles every page body in the bundler, not per request', () => {
    // `helpDocsMdxPlugin` has to be registered in this app's vite.config.ts
    // *and* vitest.config.ts. Dropping it from the build sends the docs back
    // to compiling MDX per request through `new AsyncFunction(...)`, which
    // workerd rejects with `EvalError: Code generation from strings disallowed
    // for this context` — a 500 on every /docs page, deploy-only, with a green
    // test run.
    for (const page of source.getPages()) {
      expect(page.data.body, page.url).toBeTypeOf('function');
      expect(Array.isArray(page.data.toc), page.url).toBe(true);
    }
  });

  it('registers the MDX plugin in the app build', () => {
    // Vitest reads its own config, so a build config that lost the plugin
    // would not show up in the assertion above.
    expect(readAppFile('vite.config.ts')).toMatch(/helpDocsMdxPlugin\(\)/);
  });

  it('serves every page from under the mounted base URL', () => {
    for (const page of source.getPages()) {
      expect(page.url, page.url).toMatch(new RegExp(`^${docsConfig.baseUrl}(/|$)`));
    }
  });
});

describe('the route modules serve the docs', () => {
  it('renders a page per doc, titled from docsConfig', async () => {
    const page = await import('../[[...slug]]/page');

    expect(page.generateStaticParams()).toHaveLength(source.getPages().length);

    const metadata = await page.generateMetadata({ params: Promise.resolve({ slug: undefined }) });
    expect(metadata.title).toContain(docsConfig.title);
  });

  it('mounts the Fumadocs layout', async () => {
    const layout = await import('../layout');

    expect(layout.default).toBeTypeOf('function');
  });

  it('answers the search index request', async () => {
    // Backs the client-side search box; `docsConfig.searchApi` is the URL it
    // fetches, so the route has to stay where that points.
    const route = await import('../api/docs-search/route');

    expect((await route.GET()).ok).toBe(true);
    expect(fs.existsSync(path.join(routeDir(docsConfig.searchApi), 'route.ts'))).toBe(true);
  });

  it('serves llms-full.txt', async () => {
    const route = await import('../llms-full.txt/route');
    const body = await route.GET().text();

    for (const page of source.getPages()) expect(body).toContain(`(${page.url})`);
  });

  it('serves one raw-Markdown route per page', async () => {
    const route = await import('../llms.mdx/[[...slug]]/route');

    expect(route.generateStaticParams()).toHaveLength(source.getPages().length);
  });
});

describe('the app is configured to render the docs', () => {
  it('transpiles user-help-docs, which ships TypeScript sources', () => {
    // The package has no build step — its `exports` point straight at `src`.
    expect(readAppFile('next.config.mjs')).toMatch(/transpilePackages:[^\]]*["']user-help-docs["']/);
  });

  it('imports the fumadocs CSS preset', () => {
    // Without these the docs render with no theme tokens at all.
    const css = readAppFile('app', 'globals.css');

    expect(css).toContain('fumadocs-ui/css/neutral.css');
    expect(css).toContain('fumadocs-ui/css/preset.css');
  });

  it('generates the fumadocs layout utilities Tailwind would otherwise skip', async () => {
    // Importing the preset is not enough. Fumadocs declares its own utility
    // lists as `@source inline(…)` inside `css/generated/*.css`, which
    // `preset.css` `@import`s *after* an `@plugin` at-rule — and Vite resolves
    // CSS imports with postcss-import, which stops inlining at the first
    // non-`@import` at-rule. Those files are dropped with no error, so every
    // layout class goes ungenerated and /docs renders as one unstyled column
    // with no sidebar: the page tree, the routes and the tests all stay green.
    // `globals.css` compensates by scanning `fumadocs-ui/dist` itself; this
    // check compiles the registrations it declares and looks for the classes
    // the notebook layout cannot render without.
    const css = readAppFile('app', 'globals.css');

    // Reproduce globals.css's fumadocs half without the workspace packages'
    // prebuilt `style.css` imports, which need `bun run build` to exist.
    // `@source` paths are relative to the file that declares them, so resolve
    // them against `app/` before moving the lines to a scratch entry.
    const entry = [
      '@import "tailwindcss";',
      ...css
        .split('\n')
        .filter((line) => /^@import\s+"fumadocs-ui\/css\/|^@source\s+"/.test(line.trim()))
        .map((line) =>
          line.replace(/^@source\s+"([^"]+)"/, (_match, source: string) =>
            `@source "${path.resolve(appDir, 'app', source)}"`,
          ),
        ),
    ].join('\n');

    // Inside the app so `fumadocs-ui` and the postcss config both resolve the
    // way they do for the real build.
    const entryPath = path.join(appDir, '.docs-css-check.css');
    fs.writeFileSync(entryPath, entry);

    let compiled: string;
    try {
      const result = await build({
        configFile: false,
        root: appDir,
        logLevel: 'silent',
        build: { write: false, rollupOptions: { input: entryPath } },
      });
      const outputs = (Array.isArray(result) ? result[0] : result) as {
        output: { type: string; fileName: string; source?: unknown }[];
      };
      compiled = outputs.output
        .filter((chunk) => chunk.type === 'asset' && chunk.fileName.endsWith('.css'))
        .map((chunk) => String(chunk.source))
        .join('\n');
    } finally {
      fs.rmSync(entryPath, { force: true });
    }

    // The grid container, the sidebar column's width, and one ordinary utility
    // every Fumadocs surface uses — each absent when the source lists are lost.
    expect(compiled).toContain('#nd-notebook-layout');
    expect(compiled).toContain('268px');
    expect(compiled).toContain('text-fd-muted-foreground');
  }, 60_000);
});
