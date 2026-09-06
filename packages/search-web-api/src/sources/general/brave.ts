/**
 * @fileoverview Engine adapter that scrapes Brave web search results.
 */
import { parseHTML } from "linkedom";
import { EngineFunction } from "../../types/search-engine-interface";

export const brave: EngineFunction = async (
  query: string,
  page: number | undefined
) => {
  const params = new URLSearchParams({
    q: query,
    p: String(page || 1),
  });
  const response = await fetch(`https://search.brave.com/search?${params}`, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
    },
  });
  if (!response.ok) return [];
  const htmlString = await response.text();
  const { document } = parseHTML(htmlString);

  const snippets = document.querySelectorAll(".snippet");
  console.log(`Brave: Found ${snippets.length} snippets`);

  const data = Array.from(snippets)
    .map((element) => {
      const link = element.querySelector("a");
      const url = link?.getAttribute("href") || "";
      const title =
        element.querySelector(".search-snippet-title")?.textContent?.trim() || "";
      const content =
        element
          .querySelector(".content")
          ?.textContent?.trim() || "";

      return {
        url,
        title,
        content,
        engine: "brave",
      };
    })
    .filter((r) => r.url && r.title);

  console.log(`Brave: Extracted ${data.length} valid results`);
  if (data.length === 0 && htmlString.length > 0) {
    console.log("Brave: HTML sample:", htmlString.substring(0, 1000));
  }

  return data;
};
