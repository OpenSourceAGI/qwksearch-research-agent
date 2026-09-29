/**
 * @fileoverview The autocomplete HTTP handler: query completions plus site matches.
 *
 * `search-autocomplete/server` rather than the root entry because it pulls in
 * the ranked-domain dataset; the root stays small enough for a browser.
 */
import { getSuggestions, resolveEngine } from "./autocomplete";
import { searchDomains } from "./domains";
import type { EngineName } from "./engines";

export { searchDomains } from "./domains";
export * from "./index";

export interface AutocompleteHandlerOptions {
  /** Engine used when the request names none. Default: the benchmarked `DEFAULT_ENGINE`. */
  engine?: EngineName;
  /** Suggestions returned when the request has no `limit`. Default 8. */
  defaultLimit?: number;
}

/**
 * `GET ?q=&locale=&limit=&engine=` → `{ suggestions, domains }`.
 *
 * `backends` is still read for older clients (the generated API client sends
 * it), but only its first engine is asked — there is no fan-out any more.
 */
export function createAutocompleteHandler(options: AutocompleteHandlerOptions = {}) {
  const GET = async (req: Request): Promise<Response> => {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q")?.trim();
    const locale = searchParams.get("locale") || "en-US";
    const limit = parseInt(searchParams.get("limit") || String(options.defaultLimit ?? 8), 10);
    const requested =
      searchParams.get("engine") || searchParams.get("backends")?.split(",")[0] || options.engine;

    if (!query) return Response.json({ suggestions: [], domains: [] });

    try {
      const suggestions = await getSuggestions(query, {
        engine: resolveEngine(requested),
        locale,
        signal: req.signal,
      });
      const domains = searchDomains(query);
      return Response.json({ suggestions: suggestions.slice(0, limit), domains });
    } catch (err) {
      console.error("Autocomplete error:", err);
      return Response.json({ suggestions: [], domains: [] }, { status: 500 });
    }
  };

  return { GET };
}
