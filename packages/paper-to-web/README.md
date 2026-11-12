# Paper to Web AI

`@debate-ai/paper-to-web` turns any PDF, research paper, archive link, DOI or text into the
same paper format as the *Synergy Slayer of Critiques* docs, and writes outlines in that
format from anything.

- **Paper sections**: an index page with the abstract, one page per numbered section (figure,
  a "Section Summary" of bold-lead points, numbered paragraphs with `==card underlining==`), a
  references page and a Fumadocs `meta.json`.
- **Reader**: Reader mode, Underlining on/off, and Voice, which reads the paper aloud and reads
  only the underlined words while Underlining is on, the way a debater reads a card.
- **Outlines**: with Claude, a fresh outline in the paper format from a source or a bare topic.
  Without a model, the extracted paper cut down to its summaries and underlined words.

It is standalone. The debate-ai.com site does not mount it.

## CLI

```bash
bunx paper-to-web https://arxiv.org/abs/1706.03762          # → ./attention-is-all-you-need/
bunx paper-to-web paper.pdf --format all --out my-paper
bunx paper-to-web https://bitcoin.org/bitcoin.pdf --ai       # Claude writes summaries + underlining
bunx paper-to-web "critiques in policy debate" --outline --ai
cat notes.md | bunx paper-to-web - --outline
bunx paper-to-web serve --port 8787                          # the widget as a web app
```

| Option | |
| --- | --- |
| `--outline` | Write an outline in the paper format instead of converting |
| `--ai` | Use Claude (`ANTHROPIC_API_KEY`, or an `ant auth login` profile) |
| `--model <id>` | Model for `--ai` (default `claude-opus-5-5`) |
| `--focus <text>` | Steer an outline: an angle, a resolution, a side |
| `--out <dir>` | Output folder (default: the title as a slug) |
| `--format <list>` | `mdx` (docs folder), `single` (one page), `html`, `json`, or `all`. Default `mdx,html` |

Inputs: any article or PDF URL, arXiv `abs/`/`pdf/` links (read from arXiv's HTML render so
headings survive), archive.org and web.archive.org links, DOIs, local `.pdf`, `.docx`, `.md`,
`.txt` and `.html` files, and pasted text. Scraping uses
[`extract-webpage`](https://www.npmjs.com/package/extract-webpage) and
[`extract-pdf`](https://www.npmjs.com/package/extract-pdf).

## Library

```ts
import { convertToPaper, paperToMdxFiles, paperToHtml, createAnthropicGenerator } from "@debate-ai/paper-to-web"

const paper = await convertToPaper("https://arxiv.org/abs/1706.03762", {
  mode: "paper", // or "outline"
  generate: createAnthropicGenerator(), // optional: any (prompt) => Promise<string> works
})
const files = paperToMdxFiles(paper) // { "index.mdx", "01-introduction.mdx", …, "meta.json" }
const page = paperToHtml(paper) // self-contained reader page
```

`paperToMdxFiles(paper, { accordion: "details" })` writes plain `<details>` summaries instead of
Fumadocs' `Accordion`, for MDX hosts without Fumadocs.

## Widget

```tsx
import { PaperToWeb, PaperReader } from "@debate-ai/paper-to-web/widget"

<PaperToWeb endpoint="/api/convert" />        // the converter: input, mode, AI, downloads
<PaperReader paper={paper} speak={myTts} />   // just the reader, optionally with your own voice
```

`PaperToWeb` posts to a handler from `@debate-ai/paper-to-web/server`:

```ts
import { createPaperToWebHandler } from "@debate-ai/paper-to-web/server"
export default { fetch: createPaperToWebHandler({ generate: createAnthropicGenerator() }) }
```

The handler is a plain Fetch-API `(Request) => Response`, so it runs under Bun, Workers, Deno
or Node. `GET /` serves the same widget as a standalone page.
