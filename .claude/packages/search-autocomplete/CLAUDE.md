# CLAUDE.md — `search-autocomplete`

**Read [`skills/ask-search-autocomplete`](../../../skills/ask-search-autocomplete/SKILL.md)
first.**

The search box and its query autocomplete. Published.

## Rules

- **One engine per keystroke.** Autocomplete asks a single suggest API — the
  fastest one the benchmark measured — never a fan-out. Changing
  `DEFAULT_ENGINE` in `src/autocomplete.ts` means re-running `bun run benchmark`
  (or the *Autocomplete benchmark* workflow) and updating the README table with
  the numbers it was chosen from.
- **Adapters are one `fetch` and a parse.** They run on the Cloudflare Worker:
  no DOM libraries, no Node APIs. They throw on failure so the benchmark can
  tell an outage from an empty answer; `queryEngine` is where errors are
  swallowed for the request path.
- **The domain dataset stays server-side.** `domain-rank`'s JSON is only
  imported from `src/domains.ts`, reached from the `./server` entry. The root
  and `./react` entries must never import it.
- The React pieces are domain-free: the hook owns no input, and the host passes
  its own fetcher when requests must go through a configured client.

```bash
cd packages/search-autocomplete && bun run test
bun run benchmark            # needs outbound network to the suggest APIs
```
