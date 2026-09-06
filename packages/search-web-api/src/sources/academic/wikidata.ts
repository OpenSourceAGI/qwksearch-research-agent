/**
 * @fileoverview Engine adapter that queries the Wikidata API for entity search results.
 */
import { EngineFunction } from "../../types/search-engine-interface";

export const wikidata: EngineFunction = async (
  query: string,
  _page: number | undefined
) => {
  const params = new URLSearchParams({
    action: "wbsearchentities",
    search: query,
    language: "en",
    format: "json",
    limit: "20",
  });

  const response = await fetch(
    `https://www.wikidata.org/w/api.php?${params}`,
    {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    }
  );

  if (!response.ok) return [];

  const data = await response.json();

  if (!data || !data.search) return [];

  return data.search.map((item: any) => {
    const id = item.id;
    const title = item.label || id;
    const description = item.description || "No description available";
    const url = item.url || `https://www.wikidata.org/wiki/${id}`;

    return {
      url,
      title,
      content: description,
      engine: "wikidata",
    };
  });
};
