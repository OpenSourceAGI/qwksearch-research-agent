/**
 * @fileoverview Engine adapter that queries the RubyGems API for gem search results.
 */
import { EngineFunction } from "../../types/search-engine-interface";

export const rubygems: EngineFunction = async (
  query: string,
  page: number | undefined
) => {
  const params = new URLSearchParams({
    query: query,
    page: String(page || 1),
  });
  const response = await fetch(
    `https://rubygems.org/api/v1/search.json?${params}`,
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

  if (Array.isArray(data)) {
    data.forEach((gem: any) => {
      const name = gem.name;
      const version = gem.version;
      const info = gem.info || "No description";
      const downloads = gem.downloads || 0;
      const authors = gem.authors || "";

      results.push({
        url: `https://rubygems.org/gems/${name}`,
        title: `${name} ${version}`,
        content: `${info} | By: ${authors} | 📥 ${downloads.toLocaleString()} downloads`,
        engine: "rubygems",
      });
    });
  }

  return results;
};
