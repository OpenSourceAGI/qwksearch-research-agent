/**
 * @file doctags-to-html.js
 * @description Granite Docling doctags → sanitized HTML. The conversion is
 * `extract-pdf`'s own `doctagsToHtml`; the model's text and the document it
 * read are both untrusted, so the result is sanitized before it leaves the
 * Space, even when the caller sanitizes again.
 */
import { doctagsToHtml } from "extract-pdf";
import sanitizeHtml from "sanitize-html";

/** Every tag `doctagsToHtml` emits, plus inline markup worth keeping. */
export const SANITIZE_OPTIONS = {
    allowedTags: [
        "article", "section", "p",
        "h1", "h2", "h3", "h4", "h5", "h6",
        "ul", "ol", "li",
        "table", "thead", "tbody", "tr", "th", "td", "caption",
        "figure", "figcaption",
        "strong", "em", "code", "pre", "blockquote", "sup", "sub",
        "a", "br",
    ],
    allowedAttributes: {
        "*": ["class"],
        a: ["href", "title"],
    },
    allowedSchemes: ["http", "https", "mailto"],
};

/** @param {string} doctags */
export function renderDoctagsHtml(doctags) {
    return sanitizeHtml(doctagsToHtml(doctags), SANITIZE_OPTIONS);
}
