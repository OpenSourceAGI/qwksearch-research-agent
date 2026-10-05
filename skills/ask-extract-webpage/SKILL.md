---
name: ask-extract-webpage
description: Guide to extract-webpage (packages/extract-webpage), the URL-to-cited-article pipeline — extractContent() for web pages, PDFs, YouTube and DOCX buffers, scrapeURL() fetching with bot detection and proxy fallback, Readability/Mercury content extraction, APA citation and author-name detection, the SEEKTOPIC keyphrase and summary-sentence extractor, and the tokenizer helpers. Use when extraction returns an empty or wrong article, when citation metadata (author, date, source) is missing or misformatted, when adding a site adapter, or when a build pulls pdfjs in unexpectedly.
---

# Working With extract-webpage

`packages/extract-webpage`, published as **extract-webpage**. Give it a URL and get
back the article body as HTML plus everything a citation needs. It composes
`extract-pdf`, `extract-youtube` and `chat-agent-toolkit`, so one call covers pages,
PDFs, videos and Word documents. Full surface: [API.md](API.md).

## Setup

```ts
import { extractContent } from "extract-webpage";

const article = await extractContent("https://example.com/article", { timeout: 10 });
// { title, author, author_cite, author_short, author_type, date, source,
//   cite, html, url, word_count, format }  — or { error }
```

Failures are returned as `{ error }` rather than thrown. `extractContent` also accepts
a DOM `Document`, an HTML or Markdown **string**, or an `ArrayBuffer`/`Buffer`/
`Uint8Array` (detected as DOCX; a buffer that is not DOCX returns an error).

## Picking the right call

| You want | Call |
| --- | --- |
| URL/DOM/buffer → cited article | `extractContent(urlOrDoc, options)` |
| Just the raw HTML of a page | `scrapeURL(url, { timeout, maxRedirects, checkBotDetection, changeReferer, userAgentIndex, proxy, checkRobotsAllowed })` |
| A JS-heavy page via a third party | `scrapeJINA(url)` |
| Site-specific extraction rules | `fetchScrapingRules(url)` |
| Content + citation from HTML you already have | `extractContentAndCite(documentOrHTML, options)` |
| One extraction algorithm on its own | `extractMainContentFromHTML(...)` (Readability) / `extractMainContentFromHTML2(...)` (Mercury) |
| Citation metadata only | `extractCite(document, options)` (from `extract-cite`; for a full LLM-completed citation use `extractCiteLLM`) |
| Keyphrases, or keyphrases + summary sentences | `extractSEEKTOPIC(text, options)` |
| Sentences / chunks / stems / topic tokens | `splitTextToSentences`, `splitTextSemanticChars`, `stemWordToRoot`, `convertTextToTokens`, `isWordCommonIgnored` |
| Query completions | `suggestNextWordCompletions(...)` |
| Root domain from a URL | `convertURLToDomain(url)` |
| **PDF extraction** | Nothing — `extractContent` detects PDFs and dynamically imports `extract-pdf` itself |

## Recipes

**PDFs are deliberately absent from the root entry.** `src/index.ts` exports no PDF
symbol so that `pdfjs-serverless` is never evaluated at build time. `extractContent`
still handles PDF URLs — it sniffs the `.pdf` extension / content type and `await
import("extract-pdf")`s at that point. Keep it dynamic: re-exporting the PDF path from
the barrel re-breaks the bundle for every consumer. (The `"./pdf-to-html/pdfToHtml"`
comment in `src/index.ts` is stale; that folder no longer exists.)

**Citation quality.** Author detection validates candidate names against a bundled
~90,000-name first/last-name database, which is what decides `author_type`
(`single` / `two-author` / `more-than-two` / `organization`) and therefore whether the
name is reversed for APA. `citeFormatAuthorFull` (default `true`) and
`citeFormatMonthFull` (default `false`) control the output format.

**SEEKTOPIC has two paths.** With an LLM available it extracts topic phrases and does
embedding-based sentence selection; without one it falls back to noun-anchored n-grams,
phrase folding, Wikipedia-entity boosting and TextRank. `optionSkipRanking` defaults to
`true` and returns just `KeyphraseEntry[]`; pass `false` to get `topSentences` too — and
pass `phrasesModel`, or the n-gram fallback has nothing to score against.

**Bias a summary toward a query.** `extractSEEKTOPIC(text, { heavyWeightQuery: "…",
optionSkipRanking: false, limitTopSentences: 5 })`.

## Troubleshooting

| Symptom | Cause → fix |
| --- | --- |
| `{ error }` and no `html` | Returned, not thrown — check `error` first. Common causes: timeout (default `5` seconds — raise it), bot detection, a non-DOCX binary buffer. |
| Empty or truncated article body | Readability and Mercury both failed on that markup. Try `scrapeURL` + `extractContentAndCite` to see the raw HTML, then a site rule via `fetchScrapingRules`. |
| Bot-blocked / Cloudflare interstitial | `checkBotDetection` flags it but cannot bypass it. Route through `render-url-to-html` or `html-renderer-api`, then hand the HTML to `extractContentAndCite`. |
| `pdfjs-serverless` ends up in a bundle that never asked for it | Something added a static PDF import to the root barrel. It must stay a dynamic `import("extract-pdf")` inside `extractContent`. |
| Author is the site name, or first/last are swapped | Name-database heuristics. Inspect `author_type` — `organization` suppresses the reversal, and a name absent from the database is treated as one. |
| Date is missing on a page that clearly shows one | `extract-date` reads meta tags and common class patterns; `extract-date-quick` is the fast path. Add the site's pattern to `date-extractors.ts`. |
| Relative image/link URLs in the output | `absoluteURLs` defaults to `true` — if you set it `false`, resolve them yourself. |
| SEEKTOPIC returns weak keyphrases | Without `phrasesModel` the fallback path has no phrase statistics; and the LLM path only runs on the first 5000 words. |
| YouTube URL returns no transcript | Handled by `extract-youtube`; pass `languages: ["en", …]` and see **ask-extract-youtube**. |
| Build OOMs | Use the package's `bun run make` (raised `--max-old-space-size`) rather than plain `vite build`. |
