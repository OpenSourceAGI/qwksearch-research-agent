# extract-cite

Cite any webpage. Two passes:

1. **`extractCite`**: reads author, date, title and source straight off the HTML (meta tags, bylines, JSON-LD, URL patterns, and optionally a 92k-name database that tells people from organizations). Instant, offline, partial.
2. **`extractCiteLLM`**: one model call (OpenRouter by default) that is given the partial citation and the parts still missing, completes the full APA citation, **scores the confidence of every part**, **flags parts for review**, and reads **author qualifications** from the page's bio. Output in APA 7, MLA 9, Chicago, Harvard, IEEE and BibTeX. The same call **checks the content**: is the extracted text the full article or a paywall stub, and which header, nav, sidebar and footer blocks to cut for readability.

```bash
bun add extract-cite
```

```ts
import { extractCiteLLM } from "extract-cite";

const cite = await extractCiteLLM({
  url: "https://www.npr.org/2023/12/28/1221827923/2023-hottest-year-record-climate-change",
  apiKey: process.env.OPENROUTER_API_KEY, // default provider: OpenRouter
  model: "anthropic/claude-haiku-4.5",    // default
  // baseUrl: "https://api.openai.com/v1" // any OpenAI-compatible API
});

cite.formatted.apa?.text;                  // full APA 7 entry
cite.formatted.mla?.html;                  // with <i> italics, HTML-escaped
cite.confidence;                           // { title: 0.98, publishedDate: 0.95, … }
cite.needsReview;                          // [{ field, confidence, reason }]
cite.citation.authors[0].qualifications;   // { jobTitle, affiliation, credentials, evidence, … }
cite.contentCheck?.verdict;                // "full" | "paywalled" | "truncated" | "blocked" | "not-article" | "unknown"
cite.contentCheck?.tips;                   // [{ region: "sidebar", selector: "aside.sidebar", example, tip }]
```

| Option | Default | |
| --- | --- | --- |
| `url` / `html` / `text` | | The page. A `url` alone is fetched; pass `html` or `text` for sites that block servers. |
| `apiKey` | `OPENROUTER_API_KEY` | |
| `model` | `anthropic/claude-haiku-4.5` | |
| `baseUrl` | `https://openrouter.ai/api/v1` | |
| `styles` | all | `apa`, `mla`, `chicago`, `harvard`, `ieee`, `bibtex` |
| `reviewThreshold` | `0.7` | Parts below this go in `needsReview`. |
| `maxChars` | `12000` | Page text sent to the model (head and tail). |
| `content` | page text | The article you extracted (HTML or text, e.g. extract-webpage's `html`), for the content check. |
| `checkContent` | `true` | Run the content check in the same call. |
| `contentWords` | `3000` | Words of content the check reads, from the start. |
| `fetch` | global | Replaces `fetch` for both the page and the model call. |

### Slim default vs. `extract-cite/full`

The default entry is slim (~60 kB): it does **not** bundle the 92k human-names JSON (~1 MB), so person-vs-organization detection uses word heuristics only. To get the names database:

```ts
// Lazy-load it from the jsDelivr CDN (shared, cached; resolves null on failure)
import { extractCite, loadHumanNamesDB } from "extract-cite";
await loadHumanNamesDB(); // or { url, fetch } to self-host

// Or bundle it: same API, names database registered on import
import { extractCite } from "extract-cite/full";
```

`setHumanNamesDB(db)` registers a copy you already hold. Both entries share one database, so importing `extract-cite/full` once enables it for the slim import too.

### Content check

The model reads the first `contentWords` words of `content` and an outline of the page's blocks (`header.site-header (6 words) "Example Ledger Sign in…"`) and returns `contentCheck`: a `verdict`, the `signals` that show it ("Subscribe to continue reading"), a `note` for the reader, the `contentSelector` that holds the article body, and `tips` for the clutter the content still holds (header, nav, sidebar, footer, ads, related, newsletter, share, comments, cookie banner). `selectors` is the same as `{ content, remove }`, the shape of an entry in extract-webpage's `extract-selectors-per-domain.json`. A verdict other than `full` also lands in `needsReview` as `field: "content"`.

`formatCitation(citation, style)` and `formatCitations(citation, styles)` re-style a result offline.

## What it will not do

The model's reply is not trusted. Text is fenced as untrusted data; strings are stripped of markup; dates must be real; an author whose name the page never prints is capped at 0.2 confidence and flagged; author qualifications need a verbatim quote that is on the page, or they are dropped. A part the page does not state comes back empty and flagged, not guessed. Content-check signals and examples must be in the text, and its selectors must match an element on the page, or they are dropped. Still: **check `needsReview` before you cite**.

## Moved from extract-webpage

`extractCite`, `convertURLToDomain` and `isURLValid` used to live in `extract-webpage` (`src/html-to-cite`). That code moved here unchanged; `extract-webpage` re-exports those three, so existing imports keep working.

## Demo

The Citation tab of the [extract-pdf site](../extract-pdf/site) (`/demo#cite`) runs this against news, journal, organization and blog URLs.

```bash
cd packages/extract-cite && bun run test
```
