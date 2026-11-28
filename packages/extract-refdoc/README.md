# extract-refdoc

`extract-refdoc` turns any PDF, research paper, archive link, DOI or text into **one shareable HTML
file** that opens as a full [Fumadocs](https://fumadocs.dev) docs site: sidebar, table of
contents, ⌘K search, references, previous/next, light and dark, plus Reader mode, card
Underlining and Voice read-aloud.

```bash
bunx extract-refdoc https://arxiv.org/abs/1706.03762     # → attention-is-all-you-need.refdoc.html
```

Send that one file to anyone. Opening it (from disk, an email attachment or any web host)
loads a small runtime from the CDN and boots the docs UI around the content inside the file.
Formerly `paper-to-web` / `refdoc`; everything it did (MDX docs folders, outlines, the widget and
server) is still here.

## Citation style badges

A document may show one of these citation-style badges:

![APA](https://i.imgur.com/AMDxELp.png)

![Chicago-Number](https://i.imgur.com/U2f1MaU.png)

![Chicago](https://i.imgur.com/Gs3HNXZ.png)

![Harvard](https://i.imgur.com/JLQUXZc.png)

![IEEE](https://i.imgur.com/EkIKeCA.png)

## The refdoc format

A `.refdoc.html` file is ordinary HTML with three parts:

```html
<!doctype html>
<html lang="en" class="refdoc-booting">
<head>
  <title>Attention Is All You Need</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/extract-refdoc@0/dist/refdoc.css" />
  <!-- 1. Document metadata -->
  <script type="application/refdoc+json" id="refdoc-meta">
    {"format":"refdoc","version":1,"title":"Attention Is All You Need","author":"…","sourceUrl":"…","generator":"extract-refdoc 0.2.0"}
  </script>
</head>
<body>
  <!-- 2. The whole document, one <article> per page -->
  <div id="refdoc-root">
    <article id="overview" data-refdoc-page="" data-title="Attention Is All You Need">…abstract, contents…</article>
    <article id="01-introduction" data-refdoc-page="01-introduction" data-title="1. Introduction"
             data-description="…" data-part="…">
      <h2 id="01-introduction-summary">Section Summary</h2> …
      <h3 id="01-introduction-background">Background</h3> …
    </article>
    <article id="references" data-refdoc-page="references" data-title="References">
      <ol><li id="ref-1">…</li></ol>
    </article>
  </div>
  <!-- 3. The runtime loader -->
  <script defer src="https://cdn.jsdelivr.net/npm/extract-refdoc@0/dist/refdoc.js"></script>
</body>
</html>
```

| Part | Rules |
| --- | --- |
| `#refdoc-meta` | JSON with `format: "refdoc"`, `version: 1`, `title`, and optional `description`, `author`, `date`, `sourceUrl`, `cite`, `keywords`, `generator`. `<` is written as `\u003c`. |
| `<article data-refdoc-page>` | One per page, in sidebar order. The value is the page slug; `""` is the overview. `data-title`, `data-description` and `data-part` (a sidebar separator opened by this page) are optional. The body is plain HTML. |
| ids | Each article's `id` is its slug (`overview` for the overview) and every `id` inside a page is prefixed with that page's slug, so a single `#id` names a page or a place on one. `h2`–`h4` with an `id` become the page's table of contents. |
| `[data-refdoc-fallback]` | A title block for reading the file without the runtime. The runtime drops it and renders its own title. |
| runtime | `refdoc.css` + `refdoc.js` from `https://cdn.jsdelivr.net/npm/extract-refdoc@0/dist/` (any 0.x), another base URL, or embedded inline. |

Because the content is plain HTML and exists exactly once, the file stays small (the runtime is
not inside it), reads as one long page if the CDN is unreachable, and is indexable by search
engines.

### What the runtime does

`dist/refdoc.js` (about 410 KB minified, React and Fumadocs UI included) reads the pages out of
the file and renders Fumadocs' `DocsLayout` and `DocsPage` around them, all client-side:

- **Sidebar** from the pages, with `data-part` as separators, plus a link to the source.
- **Table of contents** with scroll-spy, breadcrumb, previous/next page.
- **Search** (⌘K / Ctrl+K) over every page title, heading and paragraph in the file.
- **References**: numeric citations like `[3]`, `[3, 5]` or `[3–5]` link to the references page,
  with the reference as a tooltip.
- **Reference cards**: each reference shows its tag line, an author line (`Galloway '20 — longtime
  college debate coach at Samford University`), the full citation, and the quoted card text
  folded away until opened. Flags on the edge give the source type, a qualified author, and an
  institutional author; a text-status button shows whether the card text is full, partial, or
  missing. Clicking the red X on a missing one opens a form that posts a suggested text to the
  `submitEndpoint` (the `renderRefdocHtml` option, `--submit-endpoint <url>` on the CLI, or a
  `data-submit-endpoint` attribute on the runtime script tag). The file itself stores nothing:
  the endpoint is a backend you host, e.g. `POST /api/card-text-submissions` in `qwksearch-web`.
  Without an endpoint the X does nothing.
- **Reader mode / Underlining / Voice**: the reading bar from the original paper reader. Voice
  reads only the `==underlined==` words while Underlining is on.
- **Routing by `#id`**, so it works from `file://` and links can point at any heading.

## CLI

```bash
bunx extract-refdoc https://arxiv.org/abs/1706.03762                  # → ./<title>.refdoc.html
bunx extract-refdoc paper.pdf --out shared                            # local PDF, .docx, .md, .txt or .html
bunx extract-refdoc paper.pdf --runtime inline                        # embed the runtime: works offline (~520 KB)
bunx extract-refdoc https://bitcoin.org/bitcoin.pdf --ai              # Claude writes summaries + underlining
bunx extract-refdoc paper.pdf --format all                            # refdoc + MDX folder + .mdx + .html + .json
bunx extract-refdoc "critiques in policy debate" --outline --ai
cat notes.md | bunx extract-refdoc - --outline
bunx extract-refdoc serve --port 8787                                 # the converter widget as a web app
```

| Option | |
| --- | --- |
| `--format <list>` | `refdoc` (default), `mdx` (Fumadocs docs folder), `single` (one page), `html` (the plain reader page), `json`, or `all` |
| `--runtime <how>` | `cdn` (default), `inline` (embeds `dist/refdoc.js` and `.css`; build first), or a base URL serving `refdoc.js` and `refdoc.css` |
| `--outline` | Write an outline in the paper format instead of converting |
| `--ai` | Use Claude (`ANTHROPIC_API_KEY`, or an `ant auth login` profile) |
| `--model <id>` | Model for `--ai` (default `claude-opus-5-5`) |
| `--focus <text>` | Steer an outline: an angle, a resolution, a side |
| `--submit-endpoint <url>` | Where the "suggest the full text" form on a card with no text posts (`https://…` or a path) |
| `--out <dir>` | Output folder (default: the current folder for `refdoc` alone, else the title as a slug) |

Inputs: any article or PDF URL, arXiv `abs/`/`pdf/` links (read from arXiv's HTML render so
headings survive), archive.org and web.archive.org links, DOIs, local `.pdf`, `.docx`, `.md`,
`.txt` and `.html` files, and pasted text. Scraping uses
[`extract-webpage`](https://www.npmjs.com/package/extract-webpage) and
[`extract-pdf`](https://www.npmjs.com/package/extract-pdf).

## Library

```ts
import { convertToPaper, paperToRefdoc, parseRefdoc, renderRefdocHtml } from "extract-refdoc"

const paper = await convertToPaper("https://arxiv.org/abs/1706.03762")
const html = paperToRefdoc(paper)                                  // runtime from the CDN
const offline = paperToRefdoc(paper, { runtime: { js, css } })     // runtime embedded
const pinned = paperToRefdoc(paper, { runtime: { base: "https://cdn.jsdelivr.net/npm/extract-refdoc@0.2.0/dist" } })

const doc = parseRefdoc(html) // { title, author, …, pages: [{ slug, title, html, headings }] }
```

`renderRefdocHtml(doc)` writes any `RefdocDocument`, so a refdoc can come from something other
than a paper: build the `pages` yourself (slug, title, HTML) and pass them in. The other outputs
are unchanged: `paperToMdxFiles(paper)` (Fumadocs docs folder), `paperToSingleMdx(paper)`,
`paperToHtml(paper)` (the self-contained reader page) and `generateOutline`.

## Widget and server

```tsx
import { PaperToWeb, PaperReader } from "extract-refdoc/widget"

<PaperToWeb endpoint="/api/convert" />        // the converter: input, mode, AI, downloads (incl. .refdoc.html)
<PaperReader paper={paper} speak={myTts} />   // just the reader, optionally with your own voice
```

```ts
import { createPaperToWebHandler } from "extract-refdoc/server"
export default { fetch: createPaperToWebHandler({ generate: createAnthropicGenerator() }) }
```

The handler is a plain Fetch-API `(Request) => Response` (Bun, Workers, Deno, Node). Its
`/api/convert` reply now includes `refdoc`, the `.refdoc.html` text.

## Building the runtime

```bash
bun run build     # → dist/refdoc.js + dist/refdoc.css
bun run example   # → dist/example/debate-is-testing.refdoc.html with the runtime inlined; open it
bun run test
```

`scripts/build-runtime.ts` bundles `runtime/main.tsx` with Bun into one minified IIFE (a classic
script, so it runs from `file://`) and appends `runtime/refdoc.css` to Fumadocs UI's prebuilt
stylesheet. Fumadocs' Markdown search renderer and its API-backed default search dialog are
swapped for stubs (`runtime/stubs/`), since refdoc searches the file itself; that halves the
bundle.

The CDN copy is the npm package: the repo's npm publish workflow runs `bun run build` and
publishes `extract-refdoc`, and jsDelivr serves `dist/` at
`https://cdn.jsdelivr.net/npm/extract-refdoc@0/dist/`. Files pin `@0`, so they pick up runtime
fixes within 0.x; a breaking format change bumps the major version and `version` in
`#refdoc-meta`.
