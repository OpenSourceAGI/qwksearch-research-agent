# CLAUDE.md — `write-language`

**Read [`skills/ask-write-language`](../../skills/ask-write-language/SKILL.md)
and its `API.md` first.**

One LLM call across 10+ providers, on the Vercel AI SDK. Published; built —
rebuild after editing.

## This package exists so nothing else has to know about providers

That is the whole contract, and it is easy to erode:

- **A provider-specific branch anywhere else in the repo is a bug here.** If a
  caller needs to know which provider it is talking to, this abstraction is
  missing something — add it here rather than special-casing at the call site.
- Keep the failure shape uniform. Providers fail differently (rate limits,
  content filters, context overflow, truncated streams); callers should see one
  normalized error, not ten.
- Streaming, tool calls and structured output must behave the same regardless of
  provider, or callers end up branching anyway.

## Rules

- **Never log prompts, completions or API keys.** Prompts carry user content.
- Adding a provider is an entry plus its quirks, not a new public API.
- Token counting and context limits differ per model — get them from the
  registry, don't hardcode.

```bash
cd packages/write-language && bun run test
```
