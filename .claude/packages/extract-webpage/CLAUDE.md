# CLAUDE.md — `extract-webpage`

**Read [`skills/ask-extract-webpage`](../../../skills/ask-extract-webpage/SKILL.md)
and its `API.md` first.**

URL → cited article. Main-content detection (Readability + Mercury + ~100 site
adapters), plus APA citation metadata. The centre of the Tractor pipeline, and
it delegates to `extract-pdf`, `extract-youtube`, `domain-rank` and the
renderers. Published; built — rebuild after editing.

## Every input is hostile

The entire job is parsing pages written by someone else:

- **Malformed and adversarial HTML is the normal case.** Never let a parse
  failure escape as an unhandled exception, and never emit unsanitized page
  content — the output is rendered.
- Site adapters are per-site workarounds. When a site changes, its adapter
  breaks; that is expected and should degrade to generic extraction, not fail
  the request.
- **Citation metadata is a correctness surface.** A wrong author or date on an
  APA citation is worse than a missing one — students and researchers cite what
  this produces.

## Rules

- Fan out to the specialized extractors rather than reimplementing them:
  `extract-pdf` for PDFs, `extract-youtube` for video, `domain-rank` for the
  source label and favicon, `render-url-to-html` / `html-renderer-api` for
  JS-rendered pages.
- It also ships as an optional peer of `grab-url` in the sibling GRAB-URL repo
  (behind `grab-url --page`) — it must stay importable without dragging the
  whole app in.
- **Never `import "prismjs/components/…"`.** Those files read `Prism` off the
  global object, and nothing in the module graph pins them after whoever
  publishes it — a bundler that reorders or drops that publication turns the
  whole chunk into `ReferenceError: Prism is not defined` at load, which is how
  an embedding app's entire route dies over syntax highlighting. Grammars are
  loaded through `loadPrismGrammars()` in
  `src/html-to-content/prism-global.ts`; read the docs at the top of that file
  before you change it.

```bash
cd packages/extract-webpage && bun run test
```
