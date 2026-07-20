/**
 * @module research/agents/markdown-to-html
 * @description Converts Markdown to HTML with Prism.js syntax highlighting.
 */
import { marked } from "marked";
import Prism from "prismjs";
import loadLanguages from "prismjs/components/index.js";
import { encode, decode } from "html-entities";

loadLanguages();

// Inline onclihttps://claude.com/cai/oauth/authorize?code=true&client_id=9d1c250a-e61b-44d9-88ed-5944d1962f5e&response_type=code&redirect_uri=https%3A%2F%2Fplatform.claude.com%2Foauth%2Fcode%2Fcallback&scope=org%3Acreate_api_key+user%3Aprofile+user%3Ainference+user%3Asessions%3Aclaude_code+user%3Amcp_servers+user%3Afile_upload&code_challenge=JsLfmO6Cp0S_Fj1HNLczEOzmJxqfR-u3FIM0FPBnIiI&code_challenge_method=S256&state=CGnY-CI-nZZ9HncJj4QLdYXu_LC_bnxUHhIDTD7QL6Yck: self-contained per button, works in dangerouslySetInnerHTML contexts
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
 * Unescapes HTML entities like `&amp;` \u2192 `&`.
 */
export async function convertMarkdownToHTMLEscaped(
  markdown: string,
): Promise<string> {
  return (await marked.parse(decode(markdown))).trim();
}
