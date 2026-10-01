# CLAUDE.md — `extract-pdf`

**Read [`skills/ask-extract-pdf`](../../../skills/ask-extract-pdf/SKILL.md) and its
`API.md` first.**

PDF (URL or ArrayBuffer) → clean, structured HTML, with Docling OCR for scanned
documents. Published; built.

## Things that bite

- **A PDF is a layout format, not a document format.** Reading order, column
  detection, hyphenation across line breaks and table reconstruction are the
  real work — and the failure mode is plausible-looking scrambled text, not an
  error. Test with real multi-column and scanned documents.
- **OCR is a different, much more expensive path.** Don't route a text PDF
  through it; don't silently skip it for a scanned one.
- Hostile and corrupt PDFs are expected input: encrypted, truncated, with broken
  xref tables, or built to expand pathologically. Fail diagnosably.
- **`docling-space/` is not published.** It is the Hugging Face Docker Space
  for the OCR model, pushed to the Space by hand. Its `server/model.js` is a
  copy of `server/model.js`; change both (a test compares them).
- This package is a **coverage-build dependency** in CI — it is one of the
  packages the coverage jobs build first.

```bash
cd packages/extract-pdf && bun run test
```
