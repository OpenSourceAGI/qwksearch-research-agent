/**
 * @fileoverview Engine adapter that queries the GitHub API for repository search results.
 */
import { EngineFunction } from "../../types/search-engine-interface";

export const github: EngineFunction = async (
  query: string,
  page: number | undefined
) => {
  const params = new URLSearchParams({
    q: query,
    page: String(page || 1),
    per_page: "10",
  });
  const response = await fetch(
    `https://api.github.com/search/repositories?${params}`,
    {
      headers: {
        "User-Agent": "HonoxSearX/1.0",
        Accept: "application/vnd.github.v3+json",
      },
    }
  );
  if (!response.ok) return [];
  const data = await response.json();
  const results: any[] = [];

  if (data && data.items) {
    data.items.forEach((item: any) => {
      results.push({
        url: item.html_url,
        title: item.full_name,
        content: item.description || "No description",
        engine: "github",
      });
    });
  }

  return results;
};
