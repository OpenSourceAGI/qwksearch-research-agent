# extract-webpage API Reference

## `extractContent(urlOrDoc, options?): Promise<ExtractedArticle>`

Accepts a URL string, an HTML/Markdown string, a DOM `Document`, or an
`ArrayBuffer` / `Buffer` / `Uint8Array` (treated as DOCX). PDF URLs are detected and
routed to `extract-pdf` via a dynamic import.

### `ExtractContentOptions`

| Option | Default | Meaning |
| --- | --- | --- |
| `images` | `true` | Keep `<img>` in the output |
| `links` | `true` | Keep `<a>` in the output |
| `formatting` | `true` | Preserve inline formatting |
| `absoluteURLs` | `true` | Rewrite relative URLs against the page URL |
| `timeout` | `5` | HTTP timeout **in seconds** |
| `proxy` | `null` | Proxy URL for the fetch |
| `citeFormatMonthFull` | `false` | `January` vs `Jan.` in the citation |
| `citeFormatAuthorFull` | `true` | Full author name vs initials |
| `url` | — | Base URL when passing a `Document` or HTML string |
| `useThirdPartyBackup` | — | Allow the third-party scrape fallback |
| `languages` | — | Preferred transcript languages for YouTube URLs |

### `ExtractedArticle`

`cite`, `html`, `url`, `title`, `author`, `author_cite` (Last, First Middle),
`author_short` (Last), `author_type` (`single` / `two-author` / `more-than-two` /
`organization`), `date`, `source`, `word_count`, `format`, `error`.

## Fetching

| Export | Signature |
| --- | --- |
| `scrapeURL` | `(url, { timeout = 5, maxRedirects = 3, checkBotDetection = true, changeReferer = true, userAgentIndex = 0, proxy, checkRobotsAllowed = false }) => Promise<string \| object>` |
| `scrapeJINA` | `(url) => Promise<string>` — r.jina.ai fallback |
| `fetchScrapingRules` | `(url) => Promise<rules>` — per-site extraction rules |

`userAgentIndex`: `0` = Googlebot, `1` = default Chrome.

## Content extraction

| Export | Purpose |
| --- | --- |
| `extractContentAndCite(documentOrHTML, options)` | Content + citation in one pass |
| `extractMainContentFromHTML(...)` | Mozilla Readability port |
| `extractMainContentFromHTML2(html, opts)` | Postlight Mercury port |
| `getLinkDensity`, `classWeight`, `scoreNode`, `sanitize`, `setScore`, `scoreParagraph` | Scoring internals, exported for tuning |
| `convertHTMLToBasicHTML`, `convertHTMLToTokens`, `addDOMFunctions` | HTML normalisation |
| `convertURLSafeHTMLToHTML`, `convertURLToAbsoluteURL`, `convertMarkdownToHTML`, `convertMarkdownToFormattedHTML`, `convertHTMLToMarkdown`, `detectMarkdown`, `removeMarkdownNavigation`, `copyHTMLToClipboard` | HTML/Markdown utilities |

## Citation

| Export | Purpose |
| --- | --- |
| `extractCite(document, options)` | `ExtractCiteResult` — the whole citation block |
| `convertURLToDomain(url)`, `isURLValid(url)` | Root domain, multi-part TLD aware |

Citation code now lives in the **`extract-cite`** package (see [ask-extract-cite](../ask-extract-cite/SKILL.md)); `extract-webpage` re-exports `extractCite`, `convertURLToDomain` and `isURLValid`. Internals worth knowing when a citation is wrong, in `extract-cite/src/html-to-cite/`: `extract-author.ts`,
`extract-title.ts`, `extract-source.ts`, `human-names-recognize.ts` (the first/last-name
database that decides `author_type`), and `extract-date/` (`date-extractors.ts`,
`date-validators.ts`, `extract-date-quick.ts`).

## Other sources

| Export | Purpose |
| --- | --- |
| `getURLYoutubeVideo(url)` | Video id, or `null` |
| `convertYoutubeToText(...)` | Transcript → text (via `extract-youtube`) |
| `convertDOCXToHTML(input, options)`, `isBufferDOCX(buffer)` | DOCX |

## SEEKTOPIC

```ts
extractSEEKTOPIC(docText, options?): Promise<KeyphraseEntry[] | SEEKTOPICResult>
```

| Option | Default | Meaning |
| --- | --- | --- |
| `phrasesModel` | — | Trie phrase model for the n-gram fallback path |
| `maxWords` / `minWords` | `2` / `1` | Words per keyphrase |
| `minWordLength` | `3` | Min characters per word |
| `minKeyPhraseLength` | `5` | Min characters for the whole phrase |
| `topKeyphrasesPercent` | `0.5` | Fraction fed into the TextRank graph |
| `limitTopSentences` | `5` | Sentences returned in full mode |
| `limitTopKeyphrases` | `10` | Keyphrases returned |
| `heavyWeightQuery` | `""` | Bias weights toward this query |
| `removeHTML` | `true` | Strip tags first |
| `optionSkipRanking` | `true` | `true` → `KeyphraseEntry[]`; `false` → `SEEKTOPICResult` |
| `getEnv` | `() => ""` | Env accessor for the LLM path |

`SEEKTOPICResult`: `{ topSentences, keyphrases, sentences }`. The LLM path (topic
phrases + embedding similarity) sees only the first 5000 words; without it the pipeline
falls back to n-grams → phrase folding → Wikipedia-entity re-weighting → TextRank.

## Tokenize

`splitTextToSentences(text, options)` · `splitTextSemanticChars(text, options)` ·
`convertTextToTokens(text, options)` → `TopicToken = [string, number, number, string]` ·
`stemWordToRoot(word)` · `isWordCommonIgnored(word)` ·
`suggestNextWordCompletions(query, options)` → `SuggestionResult`.
