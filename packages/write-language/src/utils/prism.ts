/**
 * @fileoverview Exposes a small `highlightCode` helper used by
 * markdown-to-html.ts for code-block syntax highlighting. The Prism instance
 * and its language grammars are owned by `prism-global.ts`.
 */
import Prism, { loadPrismGrammars } from "./prism-global";

// Start the grammars loading now, and again from `highlightCode` below — the
// second call is what guarantees they are requested at all, since a bundler is
// free to drop this one as a side effect of a module it thinks is pure.
void loadPrismGrammars();

export function highlightCode(code: string, lang: string): string | null {
  void loadPrismGrammars();
  const grammar = Prism.languages[lang];
  if (!grammar) return null;
  return Prism.highlight(code, grammar, lang);
}

export { Prism };
