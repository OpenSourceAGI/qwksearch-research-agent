/**
 * @fileoverview Engine adapter that queries the Unsplash API for photo search results.
 */
import { EngineFunction } from "../../types/search-engine-interface";

export const unsplash: EngineFunction = async (
  query: string,
  page: number | undefined
) => {
  const params = new URLSearchParams({
    query: query,
    per_page: "20",
    page: String(page || 1),
  });
  const response = await fetch(
    `https://unsplash.com/napi/search/photos?${params}`,
    {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      },
    }
  );
  if (!response.ok) return [];
  const json = await response.json();

  if (!json || !json.results) {
    return [];
  }

  return json.results.map((item: any) => ({
    url: item.links.html,
    title:
      item.description ||
      item.alt_description ||
      "Unsplash Image",
    content: `By ${item.user.name}`,
    thumbnail: item.urls.small,
    engine: "unsplash",
  }));
};
