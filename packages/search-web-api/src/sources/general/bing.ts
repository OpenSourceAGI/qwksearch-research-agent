/**
 * @fileoverview Engine adapter that scrapes Bing web search results.
 */
import { parseHTML } from "linkedom";
import { EngineFunction } from "../../types/search-engine-interface";

export const bing: EngineFunction = async (q: string, page?: number) => {
  const params = new URLSearchParams({
    q,
    first: String(((page || 1) - 1) * 10 + 1),
  });
  const response = await fetch(`https://www.bing.com/search?${params}`, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      "Accept-Language": "en-US,en;q=0.9",
      Cookie: "CONSENT=YES+",
    },
  });
  if (!response.ok) return [];
  const text = await response.text();
  const { document } = parseHTML(text);
  return Array.from(document.querySelectorAll("li.b_algo"))
    .map((el) => {
      return {
        url: el.querySelector("h2 a")?.getAttribute("href") || "",
        title: el.querySelector("h2 a")?.textContent?.trim() || "",
        content: el.querySelector(".b_caption p")?.textContent?.trim() || "",
        engine: "bing",
      };
    })
    .filter((r) => r.url && r.title);
};
