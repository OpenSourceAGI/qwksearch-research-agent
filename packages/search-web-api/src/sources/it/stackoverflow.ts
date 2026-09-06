/**
 * @fileoverview Engine adapter that queries the Stack Exchange API for Stack Overflow question results.
 */
import { EngineFunction } from "../../types/search-engine-interface";

export const stackoverflow: EngineFunction = async (
  query: string,
  page: number | undefined
) => {
  const params = new URLSearchParams({
    order: "desc",
    sort: "relevance",
    q: query,
    site: "stackoverflow",
    page: String(page || 1),
    pagesize: "10",
  });
  const response = await fetch(
    `https://api.stackexchange.com/2.3/search?${params}`,
    {
      headers: {
        "User-Agent": "HonoxSearX/1.0",
      },
    }
  );
  if (!response.ok) return [];
  const data = await response.json();
  const results: any[] = [];

  if (data && data.items) {
    data.items.forEach((item: any) => {
      results.push({
        url: item.link,
        title: item.title,
        content: item.tags ? `Tags: ${item.tags.join(", ")}` : "",
        engine: "stackoverflow",
      });
    });
  }

  return results;
};
