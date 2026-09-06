/**
 * @fileoverview Engine adapter that queries the Packagist API for PHP package search results.
 */
import { EngineFunction } from "../../types/search-engine-interface";

export const packagist: EngineFunction = async (
  query: string,
  page: number | undefined
) => {
  const params = new URLSearchParams({
    q: query,
    page: String(page || 1),
    per_page: "15",
  });
  const response = await fetch(
    `https://packagist.org/search.json?${params}`,
    {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept: "application/json",
      },
    }
  );
  if (!response.ok) return [];
  const data = await response.json();
  const results: any[] = [];

  if (data && data.results) {
    data.results.forEach((pkg: any) => {
      const name = pkg.name;
      const description = pkg.description || "No description";
      const downloads = pkg.downloads || 0;
      const favers = pkg.favers || 0;

      results.push({
        url: pkg.url || `https://packagist.org/packages/${name}`,
        title: name,
        content: `${description} | 📥 ${downloads.toLocaleString()} downloads | ⭐ ${favers} favorites`,
        engine: "packagist",
      });
    });
  }

  return results;
};
