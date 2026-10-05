/**
 * @fileoverview extract-cite: cite any webpage.
 *
 * - `extractCite` reads author, date, title and source straight off the HTML
 *   (meta tags, selectors, JSON-LD, URL, a 92k-name database). Instant, offline,
 *   partial.
 * - `extractCiteLLM` then asks a model (OpenRouter by default) to finish the
 *   citation, score every part, flag the doubtful ones and read the authors'
 *   qualifications, and writes it as APA, MLA, Chicago, Harvard, IEEE and BibTeX.
 */
export * from "./html-to-cite/extract-cite";
export * from "./html-to-cite/url-to-domain";
export { extractHumanName } from "./html-to-cite/human-names-recognize";
export * from "./llm";
