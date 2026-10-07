/**
 * @fileoverview extract-cite: cite any webpage.
 *
 * - `extractCite` reads author, date, title and source straight off the HTML
 *   (meta tags, selectors, JSON-LD, URL). Instant, offline, partial.
 * - This default entry is slim: the 92k human-names database is not bundled.
 *   Lazy-load it from a CDN with `loadHumanNamesDB()`, or import
 *   `extract-cite/full`, which bundles it.
 * - `extractCiteLLM` then asks a model (OpenRouter by default) to finish the
 *   citation, score every part, flag the doubtful ones and read the authors'
 *   qualifications, and writes it as APA, MLA, Chicago, Harvard, IEEE and BibTeX.
 */
export * from "./html-to-cite/extract-cite";
export * from "./html-to-cite/url-to-domain";
export { extractHumanName } from "./html-to-cite/human-names-recognize";
export * from "./html-to-cite/human-names-db";
export * from "./llm";
