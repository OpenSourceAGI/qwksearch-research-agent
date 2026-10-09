/**
 * @fileoverview extract-human-name: the slim default entry.
 *
 * Extracts, characterizes, and structures human author names from
 * arbitrary text, telling a person ("Dr. John Doe") from an
 * organization ("The New York Times") and formatting APA-style
 * citations ("Doe, John").
 *
 * This entry does **not** bundle the 92k human-names JSON
 * (~1.1 MB). Person-vs-organization detection runs on the compact
 * built-in name list and word heuristics. Load the full database
 * only when needed:
 *
 * - `await loadHumanNamesDB()` — one lazy fetch from the CDN, or
 * - `import { extractHumanName } from "extract-human-name/full"` —
 *   bundles the JSON and registers it on import.
 */
export * from "./human-name-recognizer";
export * from "./human-names-db";
export * from "./common-names";
