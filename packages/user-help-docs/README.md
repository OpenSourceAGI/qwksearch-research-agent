# user-help-docs

The QwkSearch help site — content **and** the Fumadocs UI layer that renders
it. `apps/qwksearch-web` mounts it at [`/docs`](https://qwksearch.com/docs) with
a handful of thin route files; everything else lives here.

## Layout

```
content/docs/**        MDX pages + meta.json sidebar order
src/source.ts          Fumadocs loader (inlines content/docs at import time)
src/vite.ts            Vite plugin that compiles the MDX at build time
src/config.ts          Branding, links, route config — start here
src/search.ts          Static search index
src/llms.ts            llms.txt / raw-Markdown routes and URL helpers
src/layout.config.tsx  Navbar/sidebar options
src/mdx-components.tsx Components MDX pages may use without importing
src/components/**      Client components (breadcrumb, copy-for-LLM, Ask AI)
```

Content is inlined by `import.meta.glob` and compiled **by the host's bundler**,
through `helpDocsMdxPlugin()` from `user-help-docs/vite`, rather than through
`fumadocs-mdx`'s build-time collections. That's deliberate: the content lives in
its own workspace package, so this way the consuming app needs no codegen step —
just the one plugin, in its Vite config *and* its Vitest config.

It is not compiled per request either. `@fumadocs/mdx-remote`, which this package
used to use, instantiates a compiled page with `new AsyncFunction(...)`, and the
Cloudflare Worker the app deploys to refuses to generate code from strings —
`EvalError: Code generation from strings disallowed for this context`, a 500 on
every docs page that no Node-hosted test reproduces.

## Writing a page

Add an `.mdx` file under `content/docs/` with frontmatter:

```mdx
---
title: "Search"
description: "One line shown under the title and in search results."
icon: "Search"
---
```

`icon` is any [Lucide](https://lucide.dev/icons) name **as it appears in
`lucide-react`'s `icons` export** — an unknown name logs
`[lucide-icons-plugin] Unknown icon detected` at build and renders nothing.

Then add the file's slug to `content/docs/meta.json` to place it in the
sidebar. Entries wrapped in `---Like This---` render as section separators;
a folder name pulls in that folder's own `meta.json`.

Available components (no import needed): `Callout`, `Card`/`Cards`,
`Accordion`/`Accordions`, `Step`/`Steps`, `Tab`/`Tabs`, `File`/`Files`/`Folder`,
`TypeTable`. GFM tables, footnotes and strikethrough work out of the box.

## Consuming it

```tsx
// app/docs/layout.tsx
import { source } from 'user-help-docs';
import { docsConfig } from 'user-help-docs/config';
import { docsLayoutOptions } from 'user-help-docs/layout.config';

// app/docs/[[...slug]]/page.tsx — page.data.body is the compiled component
import { getMDXComponents } from 'user-help-docs/mdx-components';
import { getGithubUrl, getMarkdownUrl } from 'user-help-docs/llms';
import { Breadcrumb } from 'user-help-docs/components/breadcrumb';
import { DocsActions } from 'user-help-docs/components/docs-actions';

// app/docs/api/docs-search/route.ts
import { searchServer } from 'user-help-docs/search';

// vite.config.ts and vitest.config.ts — both, or source.ts throws at startup
import { helpDocsMdxPlugin } from 'user-help-docs/vite';
```

The app must list `user-help-docs` in `next.config`'s `transpilePackages` (it
ships TypeScript sources, not a build), and wire up four CSS lines:

```css
@import "fumadocs-ui/css/neutral.css";   /* --color-fd-* tokens */
@import "fumadocs-ui/css/preset.css";    /* base rules, variants, @source lists */
@source "../node_modules/fumadocs-ui/dist";       /* the layout classes */
@source "../../../packages/user-help-docs/src";   /* this package's components */
```

Both `@source` lines are load-bearing. Fumadocs declares its utility lists as
`@source inline(…)` inside `css/generated/*.css`, which `preset.css` `@import`s
*after* an `@plugin` at-rule — and Vite resolves CSS `@import`s with
postcss-import, which stops inlining at the first non-`@import` at-rule, so those
files are dropped with no error. The tokens still land (plain CSS), but every
class does not: `/docs` then serves every page with no sidebar, no navigation and
no styling, while the build and the tests stay green.

## Routes it expects

| Route | Backed by |
|---|---|
| `/docs/[[...slug]]` | `source` (`page.data.body` / `page.data.toc`) |
| `/docs/api/docs-search` | `searchServer.staticGET` |
| `/docs/llms.mdx/[[...slug]]` | `getLLMText`, `parseMarkdownSlug`, `getMarkdownParams` |
| `/docs/llms-full.txt` | `getLLMFullText` |

Changing `docsConfig.baseUrl` or `searchApi` means moving those route files to
match — nothing rewrites them for you. `apps/qwksearch-web`'s
`app/docs/__tests__/docs-wiring.test.ts` holds that seam: it imports each of
those route modules and checks them against `docsConfig`, along with the
`transpilePackages` entry and the CSS imports above. Nothing in CI builds the
web app, so that suite is what catches a `/docs` that would 404 or render
unstyled.

## Checks

```bash
bun install
npx tsc --noEmit
bun run test                                   # this package
cd ../../apps/qwksearch-web && bun run test    # the /docs routes that mount it
```
