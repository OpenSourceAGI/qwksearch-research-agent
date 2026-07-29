/**
 * @fileoverview Configures Prism.js with a fixed set of language grammars and exposes
 * a small `highlightCode` helper used by markdown-to-html.ts for code-block syntax
 * highlighting.
 */
import Prism from "prismjs";
import "prismjs/components/prism-markup";
import "prismjs/components/prism-css";
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-jsx";
import "prismjs/components/prism-tsx";
import "prismjs/components/prism-python";
import "prismjs/components/prism-bash";
import "prismjs/components/prism-json";
import "prismjs/components/prism-yaml";
import "prismjs/components/prism-markdown";
import "prismjs/components/prism-sql";
import "prismjs/components/prism-rust";
import "prismjs/components/prism-go";
import "prismjs/components/prism-java";
import "prismjs/components/prism-c";
import "prismjs/components/prism-cpp";

export function highlightCode(code: string, lang: string): string | null {
  const grammar = Prism.languages[lang];
  if (!grammar) return null;
  return Prism.highlight(code, grammar, lang);
}

export { Prism };
