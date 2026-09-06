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

// Configure marked once at module load with Prism.js syntax highlighting.
// marked v17 removed the `highlight` option from setOptions, so highlighting
// is wired via a custom `code` renderer instead.
marked.use({
  renderer: {
    code({ text, lang }) {
      const language = lang && Prism.languages[lang] ? lang : null;
      const highlighted = language
        ? Prism.highlight(text, Prism.languages[language], language)
        : text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
      const cls = language ? ` class="language-${language}"` : "";
      return `<pre><code${cls}>${highlighted}</code></pre>\n`;
    },
  },
});

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

  return content?.length ? marked.parse(content) : "";
}

/**
 * Regexp patterns that identify Markdown syntax. Each entry is a signal that
 * the text is Markdown rather than plain text or HTML — {@link detectMarkdown}
 * counts how many distinct signals match.
 * @private
 */
const MARKDOWN_SYNTAX_PATTERNS = [
  /^#{1,6}\s+\S/m, // ATX header: # Title
  /^[^\n]{1,120}\n(?:={3,}|-{3,})[ \t]*$/m, // setext header underline
  /!\[[^\]]*\]\([^)]+\)/, // image: ![alt](src)
  /(?<!!)\[[^\]]+\]\([^)]+\)/, // link: [text](href)
  /^\s{0,3}[-*+]\s+\S/m, // unordered list item
  /^\s{0,3}\d+[.)]\s+\S/m, // ordered list item
  /^```/m, // fenced code block
  /^\s{0,3}>\s+\S/m, // blockquote
  /\*\*[^*\n]+\*\*|__[^_\n]+__/, // bold
  /^\|?[^\n|]*\|[^\n]*\n\|?[\s:]*-{2,}[\s|:-]*$/m, // pipe table header + separator
  /^Markdown Content:$/m, // JINA reader preamble
];

/**
 * Detect whether a string is Markdown (rather than HTML or plain text) using
 * regexp checks. Content that is dominated by HTML tags is never treated as
 * Markdown, so real scraped pages pass through untouched; text needs at least
 * two distinct Markdown syntax signals (or several links/images in Markdown
 * form) to qualify. Used to catch scraper responses (e.g. the JINA reader or
 * proxies wrapping it) that return Markdown in place of HTML, so it can be
 * converted before main-content extraction — otherwise the article panel
 * renders raw `[text](url)` syntax.
 *
 * @param {string} text - The content to test.
 * @returns {boolean} True when the content should be parsed as Markdown.
 * @category HTML Utilities
 * @example
 * detectMarkdown("# Title\n\nSome **bold** text.") // true
 * detectMarkdown("<html><body><p>Hi</p></body></html>") // false
 */
export function detectMarkdown(text) {
  if (!text || typeof text !== "string") return false;

  const sample = text.slice(0, 20000);

  // HTML dominance check: a document skeleton or a meaningful density of
  // closing tags means this is HTML, not Markdown.
  if (/<!doctype\s+html|<html[\s>]|<body[\s>]/i.test(sample)) return false;
  const closingTags = sample.match(
    /<\/(?:p|div|a|span|h[1-6]|li|ul|ol|table|section|article|nav|em|strong|b|i)>/gi
  );
  if (closingTags && closingTags.length >= 3) return false;

  let signals = 0;
  for (const pattern of MARKDOWN_SYNTAX_PATTERNS)
    if (pattern.test(sample)) signals++;

  if (signals >= 2) return true;

  // A single signal still counts when Markdown links/images repeat — the
  // signature of JINA reader output for link-heavy pages.
  const mdLinks = sample.match(/!?\[[^\]]*\]\([^)]+\)/g);
  return signals >= 1 && !!mdLinks && mdLinks.length >= 3;
}

/**
 * Line-level regexps for boilerplate that JINA-style Markdown extractions
 * carry along with the article: reader-preamble metadata and common
 * navigation/chrome phrases rendered as standalone links.
 * @private
 */
const MARKDOWN_NOISE_LINE_PATTERNS = [
  /^(?:Title|URL Source|Published Time|Markdown Content|Warning|Links\/Buttons):.*$/i, // JINA metadata
  /^\[?\s*(?:skip to (?:main )?content|main menu|jump to (?:content|navigation)|menu|navigation|sign (?:in|up)|log ?in|register|subscribe(?: now)?|share(?: this)?|tweet|print|download app|open app|back to top|show all|see all|see more|view all|load more|read more|previous|next|home)\s*\]?\s*(?:\([^)]*\))?\s*$/i, // nav phrases, bare or as a single link
  /^(?:\W*\s*)?(?:accept(?: all)?(?: cookies)?|we use cookies.*|cookie (?:policy|settings|preferences)|privacy policy|terms of (?:use|service))\s*(?:\([^)]*\))?\]?\s*$/i, // cookie/legal chrome
];

/**
 * Matches a line that carries no prose of its own — only Markdown links,
 * images, bullets, pipes and punctuation. Runs of these are navigation menus,
 * breadcrumbs, and tag/related-content lists.
 * @private
 */
const MARKDOWN_LINK_ONLY_LINE =
  /^\s*(?:[-*+>|]\s*)?(?:(?:\[!\[[^\]]*\]\([^)]*\)\]\([^)]*\)|!?\[[^\]]*\]\([^)]*\))\s*(?:[|•·,/>-]\s*)?)+[.\s]*$/;

/**
 * Remove extra non-article content from a Markdown extraction using regexp
 * checks: JINA reader metadata lines, cookie/consent and navigation phrases,
 * and runs of consecutive link-only lines (menus, breadcrumbs, "related"
 * link farms) whose targets are mostly relative site navigation. Standalone
 * links inside prose are kept.
 *
 * @param {string} markdown - The Markdown content to clean.
 * @returns {string} The cleaned Markdown.
 * @category HTML Utilities
 * @example
 * removeMarkdownNavigation("Title: Page\n[Skip to content](#main)\nReal text")
 * // => "Real text"
 */
export function removeMarkdownNavigation(markdown) {
  if (!markdown || typeof markdown !== "string") return "";

  const lines = markdown.replace(/\r\n?/g, "\n").split("\n");
  const kept = [];

  // First pass: drop noise lines outside fenced code blocks.
  let inFence = false;
  for (const line of lines) {
    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      kept.push(line);
      continue;
    }
    if (
      !inFence &&
      MARKDOWN_NOISE_LINE_PATTERNS.some((pattern) => pattern.test(line.trim()))
    )
      continue;
    kept.push(line);
  }

  // Second pass: drop runs of 3+ consecutive link-only lines when the run's
  // links point mostly at relative URLs (`/path`, `#anchor`) — the signature
  // of site navigation rather than cited external sources.
  const out = [];
  let run = [];
  inFence = false;
  const flushRun = () => {
    if (!run.length) return;
    const runText = run.join("\n");
    const hrefs = [...runText.matchAll(/!?\[[^\]]*\]\(([^)\s]*)/g)].map(
      (m) => m[1]
    );
    const relative = hrefs.filter(
      (href) => href.startsWith("/") || href.startsWith("#")
    );
    const isNavRun =
      run.length >= 3 && hrefs.length > 0 && relative.length / hrefs.length >= 0.5;
    if (!isNavRun) out.push(...run);
    run = [];
  };
  for (const line of kept) {
    if (/^\s*```/.test(line)) inFence = !inFence;
    if (!inFence && MARKDOWN_LINK_ONLY_LINE.test(line)) {
      run.push(line);
      continue;
    }
    flushRun();
    out.push(line);
  }
  flushRun();

  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

/**
 * Escape the HTML-significant characters in a raw string so it can be
 * safely embedded inside generated HTML (used for code spans/blocks).
 * @param {string} str
 * @returns {string}
 */
function escapeHTMLChars(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Apply inline-level Markdown regexp replacements (images, links, bold,
 * italic, strikethrough) to a single already-block-parsed line of text.
 * Inline code spans are expected to already be swapped out for placeholders
 * so their contents are never touched here.
 * @param {string} text
 * @returns {string}
 */
function applyInlineMarkdown(text) {
  return text
    // Linked images: [![alt](src "title")](href) -- JINA emits these for
    // thumbnail links; must run before both the image and link rules or the
    // outer link's label swallows the inner image syntax.
    .replace(
      /\[!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)\]\(([^)\s]+)\)/g,
      (_m, alt, src, href) =>
        `<a href="${href}"><img src="${src}" alt="${alt}" /></a>`
    )
    // Autolinks: <https://example.com>
    .replace(
      /<(https?:\/\/[^>\s]+)>/g,
      (_m, href) => `<a href="${href}">${href}</a>`
    )
    // Images: ![alt](src "title") -- must run before links
    .replace(
      /!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g,
      (_m, alt, src, title) =>
        `<img src="${src}" alt="${alt}"${title ? ` title="${title}"` : ""} />`
    )
    // Links: [text](href "title")
    .replace(
      /\[([^\]]+)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g,
      (_m, label, href, title) =>
        `<a href="${href}"${title ? ` title="${title}"` : ""}>${label}</a>`
    )
    // Bold: **text** or __text__
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/__([^_]+)__/g, "<strong>$1</strong>")
    // Italic: *text* or _text_ (avoid matching inside words for `_`)
    .replace(/\*([^*\n]+)\*/g, "<em>$1</em>")
    .replace(/(^|[^A-Za-z0-9_])_([^_\n]+)_(?=[^A-Za-z0-9_]|$)/g, "$1<em>$2</em>")
    // Strikethrough: ~~text~~
    .replace(/~~([^~]+)~~/g, "<del>$1</del>");
}

/**
 * Convert a Markdown document to formatted HTML using regular expressions to
 * detect Markdown syntax. Unlike {@link convertMarkdownToHTML} (which relies on
 * the `marked` library), this is a dependency-free, self-contained converter
 * intended for post-processing content returned as Markdown (e.g. from the
 * JINA reader fallback in the scraper).
 *
 * Supported block elements: ATX headers (`#`..`######`), setext headers
 * (`===`/`---` underlines), fenced code blocks (```lang), blockquotes (`>`),
 * unordered lists (`-`, `*`, `+`), ordered lists (`1.`, `1)`), pipe tables,
 * horizontal rules (`---`, `***`, `___`) and paragraphs.
 * Supported inline elements: bold, italic, strikethrough, inline code, images,
 * links, linked images (`[![alt](src)](href)`) and autolinks (`<https://…>`).
 *
 * @param {string} markdown - The Markdown content to convert.
 * @returns {string} The resulting formatted HTML string.
 * @category HTML Utilities
 * @example
 * convertMarkdownToFormattedHTML("# Title\n\nSome **bold** text.");
 * // => "<h1>Title</h1>\n<p>Some <strong>bold</strong> text.</p>"
 */
export function convertMarkdownToFormattedHTML(markdown) {
  if (!markdown || typeof markdown !== "string") return "";

  let text = markdown.replace(/\r\n?/g, "\n");

  // 1. Pull fenced code blocks out first so their contents are never parsed
  // as Markdown. Each is replaced by a placeholder restored at the end.
  const codeBlocks = [];
  text = text.replace(
    /```([^\n`]*)\n([\s\S]*?)```/g,
    (_m, lang, code) => {
      const language = (lang || "").trim();
      const cls = language ? ` class="language-${language}"` : "";
      const body = escapeHTMLChars(code.replace(/\n$/, ""));
      codeBlocks.push(`<pre><code${cls}>${body}</code></pre>`);
      return `\u0000CB${codeBlocks.length - 1}\u0000`;
    }
  );

  // 2. Pull inline code spans out next for the same reason.
  const inlineCodes = [];
  text = text.replace(/`([^`\n]+)`/g, (_m, code) => {
    inlineCodes.push(`<code>${escapeHTMLChars(code)}</code>`);
    return `\u0000IC${inlineCodes.length - 1}\u0000`;
  });

  // 3. Setext headers: a text line underlined with === (h1) or --- (h2).
  // Converted to ATX form so the line loop below handles them; JINA uses
  // long === underlines for page titles.
  text = text
    .replace(/^(?![\s#>])([^\n]{1,120})\n={3,}[ \t]*$/gm, "# $1")
    .replace(/^(?![\s#>|-])([^\n]{0,119}[^\s|-])\n-{3,}[ \t]*$/gm, "## $1");

  // 4. Pipe tables: header row, |---| separator row, then body rows. Swapped
  // out for placeholders (like code blocks) so the line loop skips them.
  const tables = [];
  text = text.replace(
    /(?<=^|\n)([^\n]*\|[^\n]*)\n\|?[ \t:]*-{2,}[ \t|:-]*\n((?:[^\n]*\|[^\n]*(?:\n|$))*)/g,
    (_m, headerRow, bodyRows) => {
      const splitRow = (row) =>
        row
          .trim()
          .replace(/^\||\|$/g, "")
          .split("|")
          .map((cell) => applyInlineMarkdown(cell.trim()));
      const header = splitRow(headerRow)
        .map((cell) => `<th>${cell}</th>`)
        .join("");
      const body = bodyRows
        .split("\n")
        .filter((row) => row.trim())
        .map(
          (row) =>
            `<tr>${splitRow(row)
              .map((cell) => `<td>${cell}</td>`)
              .join("")}</tr>`
        )
        .join("");
      tables.push(
        `<table><thead><tr>${header}</tr></thead><tbody>${body}</tbody></table>`
      );
      return `\u0000TB${tables.length - 1}\u0000\n`;
    }
  );

  const lines = text.split("\n");
  const out = [];
  let inUl = false;
  let inOl = false;
  let inBlockquote = false;
  let paragraph = [];

  const flushParagraph = () => {
    if (paragraph.length) {
      out.push(`<p>${applyInlineMarkdown(paragraph.join(" "))}</p>`);
      paragraph = [];
    }
  };
  const closeLists = () => {
    if (inUl) {
      out.push("</ul>");
      inUl = false;
    }
    if (inOl) {
      out.push("</ol>");
      inOl = false;
    }
  };
  const closeBlockquote = () => {
    if (inBlockquote) {
      out.push("</blockquote>");
      inBlockquote = false;
    }
  };

  for (const line of lines) {
    // Standalone fenced-code-block placeholder line
    const cb = line.match(/^\u0000CB(\d+)\u0000$/);
    if (cb) {
      flushParagraph();
      closeLists();
      closeBlockquote();
      out.push(codeBlocks[Number(cb[1])]);
      continue;
    }

    // Standalone table placeholder line
    const tb = line.match(/^\u0000TB(\d+)\u0000$/);
    if (tb) {
      flushParagraph();
      closeLists();
      closeBlockquote();
      out.push(tables[Number(tb[1])]);
      continue;
    }

    // Blank line closes open blocks
    if (/^\s*$/.test(line)) {
      flushParagraph();
      closeLists();
      closeBlockquote();
      continue;
    }

    // Horizontal rule: ---, ***, ___ (3+)
    if (/^\s*([-*_])(?:\s*\1){2,}\s*$/.test(line)) {
      flushParagraph();
      closeLists();
      closeBlockquote();
      out.push("<hr>");
      continue;
    }

    // ATX header: # .. ######
    const header = line.match(/^\s*(#{1,6})\s+(.+?)\s*#*\s*$/);
    if (header) {
      flushParagraph();
      closeLists();
      closeBlockquote();
      const level = header[1].length;
      out.push(`<h${level}>${applyInlineMarkdown(header[2])}</h${level}>`);
      continue;
    }

    // Blockquote: > text
    const bq = line.match(/^\s*>\s?(.*)$/);
    if (bq) {
      flushParagraph();
      closeLists();
      if (!inBlockquote) {
        out.push("<blockquote>");
        inBlockquote = true;
      }
      out.push(`<p>${applyInlineMarkdown(bq[1])}</p>`);
      continue;
    }
    closeBlockquote();

    // Unordered list item: -, *, +
    const ul = line.match(/^\s*[-*+]\s+(.+)$/);
    if (ul) {
      flushParagraph();
      if (inOl) {
        out.push("</ol>");
        inOl = false;
      }
      if (!inUl) {
        out.push("<ul>");
        inUl = true;
      }
      out.push(`<li>${applyInlineMarkdown(ul[1])}</li>`);
      continue;
    }

    // Ordered list item: 1. or 1)
    const ol = line.match(/^\s*\d+[.)]\s+(.+)$/);
    if (ol) {
      flushParagraph();
      if (inUl) {
        out.push("</ul>");
        inUl = false;
      }
      if (!inOl) {
        out.push("<ol>");
        inOl = true;
      }
      out.push(`<li>${applyInlineMarkdown(ol[1])}</li>`);
      continue;
    }

    // Otherwise accumulate into the current paragraph
    closeLists();
    paragraph.push(line.trim());
  }

  flushParagraph();
  closeLists();
  closeBlockquote();

  let html = out.join("\n");

  // Restore inline code placeholders
  html = html.replace(/\u0000IC(\d+)\u0000/g, (_m, i) => inlineCodes[Number(i)]);

  return html.trim();
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
