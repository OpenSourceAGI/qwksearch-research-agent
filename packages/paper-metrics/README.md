# paper-metrics

Text statistics and readability for any text: a dependency-free TypeScript rewrite of
[textstat](https://github.com/shivam5992/textstat) (and its npm port `text-readability`), plus one
call that returns everything a reader's **Page stats** panel shows.

It works in Node, Bun, Cloudflare Workers and the browser, with no DOM, network or Node APIs.

```bash
npm i paper-metrics
```

```ts
import { getTextMetrics } from "paper-metrics"

const m = getTextMetrics(text)
// {
//   words: 82, characters: 485, letters: 396, syllables: 130, polysyllables: 11,
//   sentences: 3, paragraphs: 1, difficultWords: 11, readingMinutes: 1,
//   fleschReadingEase: 45, fleschKincaidGrade: 13.8, gunningFog: 13.4, smogIndex: 14.1,
//   automatedReadabilityIndex: 15.4, colemanLiauIndex: 11.1, linsearWriteFormula: 17.3,
//   daleChallReadabilityScore: 8.3, textStandard: 14, textStandardLabel: "13th and 14th grade",
//   readabilityScore: 45, readabilityLabel: "Difficult"
// }
```

(That is textstat's sample paragraph, "Playing games has always been thought to be important…".)

`computeMetrics` is an alias of `getTextMetrics`. Scores are rounded to one decimal. They are
`null`, never `NaN`, when the text has fewer than 10 words; `smogIndex` is also `null` below 3
sentences. `characters` counts spaces, with each run of whitespace collapsed to one space. For
HTML, use `getHtmlMetrics(html)`, or `htmlToText(html)` and then `getTextMetrics`.

## textstat API

These have the same names (in camelCase), defaults and edge cases as textstat. Each returns the
raw, unrounded number, and 0 for empty text.

| Function | Notes |
| --- | --- |
| `syllableCount(text)` | Total syllables; a single word works too |
| `lexiconCount(text, removePunctuation = true)` | Words. `false` also counts tokens that are only punctuation |
| `sentenceCount(text)` | Sentences; see [Sentences](#sentences) |
| `charCount(text, ignoreSpaces = true)`, `letterCount(text)`, `polysyllableCount(text)` | |
| `fleschReadingEase(text)` | 206.835 − 1.015 × words/sentence − 84.6 × syllables/word |
| `fleschKincaidGrade(text)` | 0.39 × words/sentence + 11.8 × syllables/word − 15.59 |
| `gunningFog(text)` | 0.4 × (words/sentence + 100 × hard words/words). A hard word has 3+ syllables and is not on the easy list |
| `smogIndex(text)` | 1.043 × √(30 × polysyllables/sentences) + 3.1291. Needs 3+ sentences, else 0 |
| `automatedReadabilityIndex(text)` | 4.71 × characters/word + 0.5 × words/sentence − 21.43 |
| `colemanLiauIndex(text)` | 0.058 × letters/100 words − 0.296 × sentences/100 words − 15.8 |
| `linsearWriteFormula(text)` | Uses the first 100 words |
| `daleChallReadabilityScore(text)` | Uses the bundled Dale-Chall list of ~3,000 easy words |
| `difficultWords(text, syllableThreshold = 2, unique = true)`, `difficultWordsList(...)` | Words not on the easy list |
| `textStandard(text, floatOutput = false)` | `"13th and 14th grade"`, or `14` with `floatOutput` |
| `readingTime(text, msPerChar = 14.69)` | Seconds |

To score one text in several ways, `countText(text)` counts it once. The `*FromCounts` functions
(`fleschReadingEaseFromCounts(counts)` and so on) then score those counts without recounting.

### How results differ from textstat

On textstat's sample paragraph, every function above returns textstat 0.7.13's value (see
`test/readability.test.ts`). In general there are three differences:

- **Syllables** come from vowel-group rules plus a short list of exceptions. textstat looks words
  up in the CMU Pronouncing Dictionary instead, which would dwarf this package. The rules agree with
  CMU on about 98% of the Dale-Chall easy words and 92% of a random sample of CMU entries (which
  are heavy with proper names). A whole text's total is usually within a few percent.
- **Sentences** are split more carefully (see below). textstat also drops "sentences" of two
  words or fewer; this package keeps them.
- **`difficultWords`** lowercases words before removing duplicates, so "Playing" and "playing"
  count once. textstat counts them twice.

### Sentences

A sentence ends at `.`, `!`, `?` or `…` followed by whitespace, or at a blank line. It does not
end at:

- decimals, versions and URLs (`3.5`, `v1.2.4`, `example.com`);
- titles and Latin abbreviations (`Dr. Smith`, `e.g. this`, `Smith et al. (2004)`);
- initials (`J. R. R. Tolkien`) and numbered labels (`Fig. 3`, `No. 5`, `pp. 12`);
- ellipses or other punctuation followed by a lowercase word (`wait... then`, `"Why?" she asked`).

`listSentences`, `listWords` and `listParagraphs` return the pieces themselves.

## Readability label

`readabilityLabel(score)` maps a Flesch Reading Ease score (clamped to 0–100) to a band:

| Score | Label |
| --- | --- |
| 90–100 | Very Easy |
| 80–89 | Easy |
| 70–79 | Fairly Easy |
| 60–69 | Standard |
| 50–59 | Fairly Difficult |
| 30–49 | Difficult |
| 0–29 | Very Confusing |

Reading time is `readingMinutes(words)`: 238 words a minute, rounded, with a minimum of 1 minute
for any text.

## Page stats panels

The refdoc reader (`extract-refdoc`) uses these to build its Info → Page stats panel. They are
framework-free, so any other reader can use them too:

```ts
import { formatReadability, getTextMetrics, pageInfoRows, readabilityRows } from "paper-metrics"

const metrics = getTextMetrics(prose)
pageInfoRows({
  stats: { ...metrics, figures: 1, citations: 2, highlights: 123 },
  lastUpdated: "2026-11-26",
  showHighlights: true,
})
// [["Words","1,807"], ["Reading time","8 min"], ["Characters","11,525"], ["Sentences","96"],
//  ["Paragraphs","4"], ["Figures","1"], ["Citations","2"], ["Highlights","123"], ["Last updated","Nov 26, 2026"]]
formatReadability(metrics) // "36/100 Difficult"
readabilityRows(metrics)   // [["Flesch Reading Ease","35.7"], …, ["Text standard (grade)","14"]]
```

For Markdown/MDX pages, `pageStats(markdown, toc)` counts sections, headings, links, figures,
tables, code blocks, author-date citations and `==highlights==`. It scores the page's running
prose (from `readableProse(markdown)`) as `metrics`.

## Package

The package is ESM TypeScript with types. As with the other packages in this monorepo, the
`paper-metrics` entry resolves to `src/index.ts`, which bundlers, Bun, Vite and `tsc` read
directly. `npm run build` also emits plain JavaScript and `.d.ts` files to `dist/`, importable as
`paper-metrics/dist/index.js`.

The Dale-Chall easy-word list comes from textstat's `resources/en/easy_words.txt` (MIT). It adds
about 20 KB of source and is parsed into a `Set` only on first use.

```bash
bun run typecheck && bun run test
```
