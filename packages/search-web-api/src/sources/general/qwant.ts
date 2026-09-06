/**
 * @fileoverview Engine adapter that queries the Qwant search API.
 */
import { EngineFunction } from "../../types/search-engine-interface";

export const qwant: EngineFunction = async (
  query: string,
  page: number | undefined
) => {
  const params = new URLSearchParams({
    q: query,
    count: "10",
    offset: String(((page || 1) - 1) * 10),
    locale: "en_US",
  });
  const response = await fetch(`https://api.qwant.com/v3/search/web?${params}`, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    },
  });
  if (!response.ok) return [];
  const jsonData = await response.json();

  if (
    !jsonData ||
    !jsonData.data ||
    !jsonData.data.result ||
    !jsonData.data.result.items
  ) {
    return [];
  }

  return jsonData.data.result.items.map((item: any) => ({
    url: item.url,
    title: item.title,
    content: item.desc,
    engine: "qwant",
  }));
};
