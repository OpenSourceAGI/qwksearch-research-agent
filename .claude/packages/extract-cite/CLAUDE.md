# CLAUDE.md — `extract-cite`

**Read [`skills/ask-extract-cite`](../../../skills/ask-extract-cite/SKILL.md) first.**

Citation extraction, split out of `extract-webpage`: the regex/metadata pass
(`src/html-to-cite`, moved unchanged) and the LLM pass (`src/llm`). Published;
built — rebuild after editing, because `extract-webpage` consumes `dist`.

## Rules

- **A wrong author or date is worse than a missing one.** The LLM pass must
  return empty-and-flagged rather than a guess. Never loosen the checks in
  `parse-reply.ts` (grounding of author names and bio quotes, date validation,
  markup stripping) to make a test pass.
- **The model's output is untrusted** and ends up in rendered HTML: strip it,
  cap it, escape it in `format-citation.ts`.
- **Page text is untrusted** too: it is fenced in the prompt and `unfence`d.
- No dependency on `extract-webpage` (it depends on this). The LLM call is a
  plain `fetch` to an OpenAI-compatible endpoint, OpenRouter by default; keep
  it provider-neutral and keep `fetch` injectable so tests never hit a network.
- **The default entry stays slim.** Never import `human-names-92k.json` outside
  `src/full.ts`; everything else reads it through `getHumanNamesDB()` in
  `human-names-db.ts` (set by `/full` or `loadHumanNamesDB()` from the CDN).
- `extract-pdf/site/types/extract-cite.d.ts` is a hand copy of `src/llm/types.ts`
  for the site's strict `tsc`: update it with the types.

```bash
cd packages/extract-cite && bun run test
```
