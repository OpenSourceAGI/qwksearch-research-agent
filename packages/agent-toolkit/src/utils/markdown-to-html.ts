/**
 * @module research/agents/markdown-to-html
 * @description Converts Markdown to HTML with Highlight.js syntax highlighting.
 */
import { marked } from "marked";
import hljs from "highlight.js";
import { encode, decode } from "html-entities";

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

// Configure marked once at module load \u2014 stacking use() calls would duplicate extensions
marked.use({ breaks: true, gfm: true, async: true });

marked.use({
  renderer: {
    code({ text, lang }) {
      const language = lang || "plaintext";
      let highlighted: string;

      try {
        if (language && hljs.getLanguage(language)) {
          highlighted = hljs.highlight(text, { language }).value;
        } else {
          highlighted = hljs.highlightAuto(text).value;
        }
      } catch (e) {
        highlighted = encode(text);
      }

      return `<figure class="code-block"><button class="code-copy-btn" type="button" onclick="${COPY_ONCLICK}">Copy</button><pre><code class="hljs language-${language}">${highlighted}</code></pre></figure>`;
    },
  },
});

/**
 * Convert markdown text to HTML with Highlight.js syntax highlighting.
 * Unescapes HTML entities like `&amp;` \u2192 `&`.
 */
export async function convertMarkdownToHTMLEscaped(
  markdown: string,
): Promise<string> {
  return (await marked.parse(decode(markdown))).trim();
}
