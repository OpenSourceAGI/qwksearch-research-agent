/**
 * @fileoverview Engine adapter that scrapes DuckDuckGo HTML search results.
 */
import { parseHTML } from "linkedom";
import { EngineFunction } from "../../types/search-engine-interface";

export const duckduckgo: EngineFunction = async (
  query: string,
  page?: number
) => {
  const response = await fetch("https://duckduckgo.com/html", {
    method: "POST",
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Content-Type": "application/x-www-form-urlencoded",
      "Accept-Language": "en-US,en;q=0.9",
    },
    body: `q=${encodeURIComponent(query)}&b=&kl=us-en`,
  });
  if (!response.ok) return [];
  const htmlString = await response.text();
  const { document } = parseHTML(htmlString);

  const snippets = document.querySelectorAll(".result");
  console.log(`DDG: Found ${snippets.length} results`);

  const data = Array.from(snippets)
    .map((element) => {
      const link = element.querySelector(".result__title a");
      const url = link?.getAttribute("href") || "";
      const title = link?.textContent?.trim() || "";
      const content =
        element.querySelector(".result__snippet")?.textContent?.trim() ||
        "";

      return {
        url,
        title,
        content,
        engine: "duckduckgo",
      };
    })
    .filter((r) => r.url && r.title);

  console.log(`DDG: Extracted ${data.length} valid results`);
  if (data.length === 0 && htmlString.length > 0) {
    console.log("DDG: HTML sample:", htmlString.substring(0, 1000));
  }

  return data;
};
