/**
 * @module research/agents/markdown-to-html
 * @description Converts Markdown to HTML with Prism.js syntax highlighting.
 */
import { marked } from "marked";
import Prism from "prismjs";
import loadLanguages from "prismjs/components/index.js";
import { encode, decode } from "html-entities";

loadLanguages();

// Inline onclick: self-contained per button, works in dangerouslySetInnerHTML contexts
const COPY_ONCLICK = [
  "(function(b){",
  "var c=b.closest('figure.code-block')?.querySelector('pre code');",
  "if(!c)return;",
  "navigator.clipboard.writeText(c.innerText).then(function(){",
  "var t=b.textContent;b.textContent='Copied!';",
  "setTimeout(function(){b.textContent=t},2000)",
  "})",
  "})(this)",
].join("");

// Configure marked once at module load — stacking use() calls would duplicate extensions
marked.use({ breaks: true, gfm: true, async: true });

marked.use({
  renderer: {
    code({ text, lang }) {
      const language = lang || "plaintext";
      let highlighted: string;

      try {
        if (language && Prism.languages[language]) {
          highlighted = Prism.highlight(text, Prism.languages[language], language);
        } else {
          highlighted = encode(text);
        }
      } catch (e) {
        highlighted = encode(text);
      }

      return `<figure class="code-block"><button class="code-copy-btn" type="button" onclick="${COPY_ONCLICK}">Copy</button><pre><code class="language-${language}">${highlighted}</code></pre></figure>`;
    },
  },
});

/**
 * Convert markdown text to HTML with Prism.js syntax highlighting.
 * Unescapes HTML entities like `&amp;` → `&`.
 */
export async function convertMarkdownToHTMLEscaped(
  markdown: string,
): Promise<string> {
  return (await marked.parse(decode(markdown))).trim();
}
