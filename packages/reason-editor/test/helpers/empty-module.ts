/**
 * Stub for CSS side-effect imports pulled in by third-party ESM (e.g.
 * `@platejs/math` importing `katex/dist/katex.min.css`). Vitest runs with
 * `test.css` off, so the stylesheet contributes nothing to the assertions —
 * but Node still has to be able to load the specifier.
 */
export default {};
