---
name: ask-extract-cite
description: Guide to extract-cite (packages/extract-cite) — regex/metadata citation extraction (extractCite) plus extractCiteLLM, an OpenRouter-by-default LLM pass that completes the full APA citation, scores confidence per part, flags parts for review, extracts author qualifications and formats APA/MLA/Chicago/Harvard/IEEE/BibTeX. Use when a citation is wrong or incomplete, when adding a citation style, or when changing the prompt or the checks on the model's reply.
---

# Working With extract-cite

`packages/extract-cite`, published as **extract-cite**. It owns the citation code
that used to sit in `extract-webpage/src/html-to-cite`; `extract-webpage` imports it
and re-exports `extractCite`, `convertURLToDomain`, `isURLValid`.

## Picking the right call

| You want | Call |
| --- | --- |
| Fast, offline, partial citation from HTML | `extractCite(documentOrHTML, { url })` |
| Full citation + confidence + review flags + author bios | `await extractCiteLLM({ url, apiKey, model })` |
| Same, for a page you already hold | `extractCiteLLM({ html, url })` or `{ text }` |
| Another provider | `baseUrl` — any OpenAI-compatible chat-completions API |
| One style from existing data | `formatCitation(citation, "mla")` |
| Is the extracted article complete, or a paywall stub? What to cut? | `extractCiteLLM({ html, url, content: article.html })` → `contentCheck` |

## How the LLM pass works (`src/llm`)

1. `extractCite` gives the partial; `missingFields` names what it cannot supply.
2. `preparePage` builds the model input: head + tail of the text, citation `<meta>`, JSON-LD.
3. `callLLM` — one `chat/completions` call, `temperature: 0`, JSON object reply. Defaults: OpenRouter, `anthropic/claude-haiku-4.5`, key from `apiKey` or `OPENROUTER_API_KEY`.
4. `parseCitationReply` normalizes and **checks** the reply (see below) and builds `needsReview`.
5. `formatCitations` writes the requested styles.
6. Content check (`content-check.ts`, on unless `checkContent: false`): `prepareContent` sends the first `contentWords` (3000) words of `content` (default: the page text) and `pageOutline`, the page's blocks as selectors; `CONTENT_CHECK_PROMPT` is appended to the system prompt; `parseContentCheck` returns `contentCheck` (verdict, signals, note, tips, `contentSelector`, `selectors` in the per-domain-selector shape). Not `full` → a `content` item in `needsReview`.

## Checks that must stay

Author names must appear in the page text (else capped at 0.2 and flagged);
qualification `evidence` must be quoted from the page (else the qualifications
are dropped and flagged); dates must be real `YYYY[-MM[-DD]]`; strings lose markup;
a missing author/title/date is flagged, not invented. Regex/LLM agreement adds 0.1.
Content-check signals and examples must appear in the text, and selectors must
be valid and match an element on the page, or they are dropped.

## Gotchas

| Symptom | Cause |
| --- | --- |
| `extract-webpage` tests can't resolve `extract-cite` | It is consumed as built `dist`. `bun run build` in `packages/extract-cite` (CI does it). |
| `401 No API key` | Neither `apiKey` nor `OPENROUTER_API_KEY` is set. |
| NYT and other sites 403 | They block server fetches. Fetch the HTML elsewhere and pass `html`. |
| Site typecheck fails after changing `types.ts` | Update `extract-pdf/site/types/extract-cite.d.ts`. |

Demo: Citation tab of `packages/extract-pdf/site` (`/demo#cite`, `POST /api/cite`).
