/**
 * @fileoverview Engine adapter that scrapes Yahoo web search results.
 */
import { parseHTML } from "linkedom";
import { EngineFunction } from "../../types/search-engine-interface";

export const yahoo: EngineFunction = async (
  query: string,
  page: number | undefined
) => {
  const params = new URLSearchParams({
    p: query,
    b: String(((page || 1) - 1) * 7 + 1),
  });
  const response = await fetch(`https://search.yahoo.com/search?${params}`, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
    },
  });
  if (!response.ok) return [];
  const htmlString = await response.text();
  const { document } = parseHTML(htmlString);

  return Array.from(document.querySelectorAll(".algo-sr"))
    .map((element) => {
      const link = element.querySelector("a");
      const url = link?.getAttribute("href") || "";
      const title = link?.textContent?.trim() || "";
      const content =
        element.querySelector(".compText")?.textContent?.trim() || "";

      return {
        url,
        title,
        content,
        engine: "yahoo",
      };
    })
    .filter((r) => r.url && r.title);
};
