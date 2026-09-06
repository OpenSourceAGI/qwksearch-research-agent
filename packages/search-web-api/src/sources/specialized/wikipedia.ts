/**
 * @fileoverview Engine adapter that queries the Wikipedia API for article search results.
 */
import { EngineFunction, EngineResult } from "../../types/search-engine-interface";

export const wikipedia: EngineFunction = async (
  query: string,
  page: number | undefined
) => {
  const params = new URLSearchParams({
    action: "query",
    list: "search",
    srsearch: query,
    format: "json",
    sroffset: String(((page || 1) - 1) * 10),
  });
  const response = await fetch(
    `https://en.wikipedia.org/w/api.php?${params}`,
    {
      headers: {
        "User-Agent": "HonoxSearX/1.0 (mailto:admin@example.com)",
      },
    }
  );
  if (!response.ok) return [];
  const data = await response.json();

  const results: EngineResult[] = (
    data.query?.search || []
  ).map((item: any) => ({
    url: `https://en.wikipedia.org/wiki/${encodeURIComponent(
      item.title.replace(/ /g, "_")
    )}`,
    title: item.title,
    content: item.snippet.replace(/<[^>]+>/g, ""),
    engine: "wikipedia",
  }));

  return results;
};
