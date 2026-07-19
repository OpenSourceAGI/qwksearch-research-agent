/**
 * Autocomplete API Route
 *
 * Provides search query autocomplete/suggestions endpoint
 */

import { Hono } from "hono";
import {
  searchAutocomplete,
  searchAutocompleteMulti,
  backends,
} from "../../lib/suggest-next-words/autocomplete-search-engines";

const autocompleteRoute = new Hono();

/**
 * GET /autocomplete
 * Get autocomplete suggestions from a specific backend
 *
 * Query parameters:
 * - q: Search query (required)
 * - backend: Autocomplete backend name (default: 'google')
 * - locale: Language/locale code (default: 'en-US')
 *
 * Example: /autocomplete?q=typescript&backend=google&locale=en-US
 */
autocompleteRoute.get("/", async (c) => {
  const q = c.req.query("q");
  const backend = c.req.query("backend") || "google";
  const locale = c.req.query("locale") || "en-US";

  if (!q) {
    return c.json(
      {
        error: 'Query parameter "q" is required',
        suggestions: [],
      },
      400
    );
  }

  const suggestions = await searchAutocomplete(backend, q, locale);

  return c.json({
    query: q,
    backend,
    locale,
    suggestions,
  });
});

/**
 * GET /autocomplete/multi
 * Get autocomplete suggestions from multiple backends
 *
 * Query parameters:
 * - q: Search query (required)
 * - backends: Comma-separated list of backend names (default: 'google,duckduckgo')
 * - locale: Language/locale code (default: 'en-US')
 *
 * Example: /autocomplete/multi?q=python&backends=google,duckduckgo,wikipedia
 */
autocompleteRoute.get("/multi", async (c) => {
  const q = c.req.query("q");
  const backendsParam = c.req.query("backends") || "google,duckduckgo";
  const locale = c.req.query("locale") || "en-US";

  if (!q) {
    return c.json(
      {
        error: 'Query parameter "q" is required',
        suggestions: [],
      },
      400
    );
  }

  const backendNames = backendsParam.split(",").map((b) => b.trim());
  const suggestions = await searchAutocompleteMulti(backendNames, q, locale);

  return c.json({
    query: q,
    backends: backendNames,
    locale,
    count: suggestions.length,
    suggestions,
  });
});

/**
 * GET /autocomplete/backends
 * List available autocomplete backends
 */
autocompleteRoute.get("/backends", (c) => {
  const availableBackends = Object.keys(backends).map((name) => ({
    name,
    description: getBackendDescription(name),
  }));

  return c.json({
    backends: availableBackends,
    count: availableBackends.length,
  });
});

/**
 * Get description for autocomplete backend
 */
function getBackendDescription(name: string): string {
  const descriptions: { [key: string]: string } = {
    baidu: "Baidu (Chinese search engine)",
    brave: "Brave Search",
    duckduckgo: "DuckDuckGo (privacy-focused)",
    google: "Google Search",
    qwant: "Qwant (European search engine)",
    startpage: "Startpage (privacy-focused)",
    wikipedia: "Wikipedia",
    yandex: "Yandex (Russian search engine)",
  };

  return descriptions[name] || name;
}

export default autocompleteRoute;
