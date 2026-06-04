// @ts-nocheck
/**
 * @module research/extractor/html-to-content/html-utils
 * @description Research library module.
 */
/**
 * Converts URL-safe escaped HTML codes like &"'`&rsquo; & to standard HTML or in reverse.
 * @param {string} str - The string to process.
 * @param {boolean} toStandardHTML  default=true - If true, converts url-safe codes
 * to standard HTML. If false, converts standard HTML to url-safe codes.
 * @return {string} The processed string.
 * @category HTML Utilities
 * @example
 * var normalHTML = convertURLSafeHTMLToHTML('&lt;p&gt;This &amp; that &copy; 2023 '+
 * '&quot;Quotes&quot;&#39;Apostrophes&#39; &euro;100 &#x263A;&lt;/p&gt;', true)
 * console.log(normalHTML) // "<p>This & that \u00a9 2023 "Quotes" 'Apostrophes' \u20ac100 \u263a</p>"
 */
export function convertURLSafeHTMLToHTML(str, toStandardHTML = true) {
  const entityMap = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    " ": "&nbsp;",
    "'": "&#39;",
    "`": "&#96;",
    "\u00a2": "&cent;",
    "\u00a3": "&pound;",
    "\u00a5": "&yen;",
    "\u20ac": "&euro;",
    "\u00a9": "&copy;",
    "\u00ae": "&reg;",
    "\u2122": "&trade;",
  };

  // Add numeric character references for Latin-1 Supplement characters
  for (let i = 160; i <= 255; i++) {
    entityMap[String.fromCharCode(i)] = `&#${i};`;
  }

  if (toStandardHTML) {
    // Create a reverse mapping for unescaping
    const reverseEntityMap = Object.fromEntries(
      Object.entries(entityMap).map(([k, v]) => [v, k])
    );

    // Add alternative representations
    reverseEntityMap["&apos;"] = "'";
    reverseEntityMap["&laquo;"] = "\u00ab";
    reverseEntityMap["&raquo;"] = "\u00bb";

    // Regex to match all types of HTML entities
    const entityRegex = new RegExp(
      Object.keys(reverseEntityMap).join("|") + "|&#[0-9]+;|&#x[0-9a-fA-F]+;",
      "g"
    );

    str = str.replace(entityRegex, (entity) => {
      if (entity.startsWith("&#x")) {
        // Convert hexadecimal numeric character reference
        return String.fromCharCode(parseInt(entity.slice(3, -1), 16));
      } else if (entity.startsWith("&#")) {
        // Convert decimal numeric character reference
        return String.fromCharCode(parseInt(entity.slice(2, -1), 10));
      }
      // Convert named entity
      return reverseEntityMap[entity] || entity;
    });

    str = str.replace(/[\u0300-\u036f]/g, ""); //special chars

    return str;
  } else {
    // Regex to match all characters that need to be escaped
    const charRegex = new RegExp(`[${Object.keys(entityMap).join("")}]`, "g");
    return str.replace(charRegex, (char) => entityMap[char]);
  }
}

/**
 * Convert relative URL to absolute URL using base URL.
 * @param {string} base base url of the domain
 * @param {string} relative partial urls like ../images/image.jpg #hash
 * @returns {string} absolute URL
 * @example
 * var absoluteURL = convertURLToAbsoluteURL('https://example.com', 'images/image.jpg')
 * console.log(absoluteURL) // Returns: "https://example.com/images/image.jpg"
 * var absoluteURL = convertURLToAbsoluteURL('https://example.com', '//images/image.jpg')
 * console.log(absoluteURL) // Returns: "https:images/image.jpg"
 * @category HTML Utilities
 * @author [vtempest (2025)](https://github.com/vtempest)
 */
export function convertURLToAbsoluteURL(base, relative) {
  // remove the %20 codes like data:image/svg+xml,%3Csvg%20x
  relative = decodeURI(relative);
  base = decodeURI(base);

  if (
    relative.includes("data:") ||
    relative.startsWith("#") ||
    relative.startsWith("http")
  )
    return relative;

  // Remove hash from base URL
  base = base.replace(/#.*$/, "");

  // If relative URL starts with '//', add scheme from base
  if (relative.startsWith("//")) return base.split("://")[0] + ":" + relative;

  // If relative URL starts with '/', replace everything after the host in base
  if (relative[0] === "/") {
    const matchdomain = base.match(/^(https?:\/\/[^\/]+)/i);
    const domain = matchdomain ? matchdomain[1] : null;

    return domain + relative;
  }
  // Handle relative URLs

  if (relative.startsWith("../")) {
    base = base.replace(/\/[^\/]+$/, "");

    while (relative.substring(0, 3) === "../") {
      relative = relative.substring(3);
      base = base.replace(/\/[^\/]+$/, "");
    }
    relative = relative.replace(/^\.\//, "");
  }

  // Combine base and relative
  //
  if (relative.startsWith("/")) {
    base = base.replace(/\/[^\/]+$/, "");

    return base.replace(/\/+$/, "") + relative;
  } else {
    return base.split("/").slice(0, -1).join("/") + "/" + relative;
  }
}

import { marked } from "marked";
import hljs from "highlight.js";

/**
 * Converts Markdown text to HTML. It handles the following Markdown elements:
 * - Headers (h1 to h6)
 * - Bold text
 * - Italic text
 * - Unordered lists
 * - Ordered lists
 * - Paragraphs
 * - Images
 * - Links
 * - Code blocks
 * @param {string} content - The Markdown or HTML content to be converted.
 * @param {boolean} toHtml - default=true - If true, converts Markdown to HTML.
 *                          If false, converts HTML to Markdown.
 * @returns {string} The resulting HTML string.
 * @category HTML Utilities
 * @example
 * const markdown = "# Header\n\nThis is **bold** and *italic* text.\n\n* List item 1\n* List item 2";
 * const html = convertMarkdownToHTML(markdown);
 * console.log(html);
 * // Output:
 * // <h1>Header</h1>
 * // <p>This is <strong>bold</strong> and <em>italic</em> text.</p>
 * // <ul><li>List item 1</li><li>List item 2</li></ul>
 */
export function convertMarkdownToHTML(content, toHtml = true) {
  if (!toHtml) return convertHTMLToMarkdown(content);

  // const md = new MarkdownIt({
  //   highlight: function (str, lang) {
  //     // If a language is provided and it's recognized by hljs
  //     if (lang && hljs.getLanguage(lang)) {
  //       try {
  //         return (
  //           '<pre><code class="hljs">' +
  //           hljs.highlight(str, { language: lang, ignoreIllegals: true }).value
  //           + '</code></pre>'
  //         );
  //       } catch (__) {}
  //     }

  //     // Default fallback for unsupported or no language
  //     return (
  //       '<pre><code class="hljs">' + md.utils.escapeHtml(str) + '</code></pre>'
  //     );
  //   },
  // }).use(function (md) {
  //   // Override the default fence rule for handling code blocks
  //   const fence = md.renderer.rules.fence || function (tokens, idx, options, env, slf) {
  //     const token = tokens[idx];
  //     const code = token.content
  //       .trim() // Trim leading/trailing whitespace
  //       .replace(/^[ \t]*/gm, '') // Remove leading whitespace while preserving relative indentation
  //       .replace(/&/g, '&amp;') // Encode HTML special characters
  //       .replace(/</g, '&lt;')
  //       .replace(/>/g, '&gt;')
  //       .replace(/"/g, '&quot;')
  //       .replace(/'/g, '&#39;');

  //     // Wrap code in a blockquote and ignore the language name
  //     return `<blockquote class="custom-code-block"><pre><code>${code}</code></pre></blockquote>`;
  //   };

  //   md.renderer.rules.fence = fence;
  // });

  // // Render markdown content
  // return md.render(content);

  marked.setOptions({
    highlight: function (code, lang) {
      const language = hljs.getLanguage(lang) ? lang : "plaintext";
      return hljs.highlight(code, { language }).value;
    },
    langPrefix: "hljs language-",
  });

  return content?.length ? marked.parse(content) : "";

  var html = contentconvertMarkdownToHTML
    // Convert headers
    .replace(/^(#{1,6})\s(.+)$/gm, (match, hashes, content) => {
      const level = hashes.length;
      return `<h${level}>${content.trim()}</h${level}>`;
    })

    // Convert bold text
    .replace(/\*\*(.+?)\*\*/g, "<b>$1</b>")

    // Convert italic text
    .replace(/\*(.+?)\*/g, "<em>$1</em>")

    // Convert unordered lists
    .replace(/^\s*\*\s(.+)$/gm, "<li>$1</li>")
    .replace(/(<li>.*<\/li>)/s, "<ul>$1</ul>")

    // Convert ordered lists
    .replace(/^\s*\d+\.\s(.+)$/gm, "<li>$1</li>")
    .replace(/(<li>.*<\/li>)/s, "<ol>$1</ol>")

    // Convert horizontal rules (---, ___, ***)
    .replace(/^[-_*]{3,}\s*$/gm, "<hr>")

    // Convert code blocks (```)
    .replace(/```([^`]+)```/g, "<code>$1</code>")

    .replace(/```(\w*)\n([\s\S]*?)```/g, function (match, lang, code) {
      code = code
        .trim()
        // Remove leading whitespace from each line while preserving relative indentation
        .replace(/^[ \t]*/gm, "")
        // Encode HTML special characters
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");

      return lang
        ? `<code class="language-${lang}">${code}</code>`
        : `<code>${code}</code>`;
    })

    // Handle inline code blocks
    .replace(
      /(^|[^\\])(`+)([^\r]*?[^`])\2(?!`)/gm,
      function (match, pre, backticks, code) {
        code = code
          .trim()
          // Remove leading and trailing whitespace
          .replace(/^[ \t]*/g, "")
          .replace(/[ \t]*$/g, "")
          // Encode HTML special characters

          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&#39;");

        return pre + "<code>" + code + "</code>";
      }
    )

    // Convert inline code (`)
    .replace(/`([^`]+)`/g, "<code>$1</code>")

    // Convert paragraphs
    .split("\n\n")
    .map((para) => {
      if (!para.startsWith("<")) {
        return `<p>${para.trim()}</p>`;
      }
      return para;
    })
    .join("\n")

    // Convert images
    .replace(/\!\[(.*?)\]\((.*?)\)/g, '<img src="$2" alt="$1" />')

    // Convert links
    .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>')

    // Clean up extra newlines
    .replace(/\n\s*\n/g, "\n")
    .trim();

  return html;
}

export function convertHTMLToMarkdown(html) {
  var markdown = html
    // Convert headers
    .replace(/<h([1-6])>(.*?)<\/h[1-6]>/g, (match, level, content) => {
      return "#".repeat(parseInt(level)) + " " + content.trim() + "\n\n";
    })

    // Convert bold text
    .replace(/<strong>(.*?)<\/strong>/g, "**$1**")
    .replace(/<b>(.*?)<\/b>/g, "**$1**")

    // Convert italic text
    .replace(/<em>(.*?)<\/em>/g, "*$1*")

    // Convert unordered lists
    .replace(/<ul>(.*?)<\/ul>/gs, (match, content) => {
      return content.replace(/<li>(.*?)<\/li>/g, "* $1\n") + "\n";
    })

    // Convert ordered lists
    .replace(/<ol>(.*?)<\/ol>/gs, (match, content) => {
      let index = 1;
      return (
        content.replace(/<li>(.*?)<\/li>/g, () => `${index++}. $1\n`) + "\n"
      );
    })

    // Convert paragraphs
    .replace(/<p>(.*?)<\/p>/g, "$1\n\n")

    // Convert images
    .replace(/<img src="(.*?)" alt="(.*?)".*?\/>/g, "![$2]($1)")

    // Convert links
    .replace(/<a href="(.*?)">(.*?)<\/a>/g, "[$2]($1)")

    // Remove any remaining HTML tags
    .replace(/<[^>]*>/g, "")

    // Trim extra whitespace
    .trim();

  return markdown;
}

/**
 * Copy HTML to clipboard. When pasting into rich text field,
 * pastes rich text. When pasting into plain text field, pastes:
 * plain text, html, or markdown.
 *
 * @param {string} html - The HTML content to be copied.
 * @param {object} options - The options object.
 * @param {number} options.pastePlainFormat -
 * default=0
 * 0 - plain text
 * 1 - markdown
 * 2 - html
 * @returns {Promise<void>} - A promise that resolves when
 * the HTML is copied to the clipboard.
 * @category HTML Utilities
 * @author [vtempest (2025)](https://github.com/vtempest)
 */
export async function copyHTMLToClipboard(html, options = {}) {
  var { pastePlainFormat = 0 } = options;

  if (typeof window == "undefined" || !navigator?.clipboard) return;

  const htmlBlob = new Blob([html], { type: "text/html" });

  var plainText =
    pastePlainFormat == 0
      ? html.replace(/<[^>]*>?/g, "")
      : pastePlainFormat == 1
        ? convertMarkdownToHTML(html, false)
        : html;

  const textBlob = new Blob([plainText], { type: "text/plain" });

  const clipboardItem = new window.ClipboardItem({
    "text/html": htmlBlob,
    "text/plain": textBlob,
  });

  return await navigator.clipboard.write([clipboardItem]);
}
