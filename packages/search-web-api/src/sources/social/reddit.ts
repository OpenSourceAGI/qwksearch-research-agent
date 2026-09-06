/**
 * @fileoverview Engine adapter that scrapes Reddit search results.
 */
import { parseHTML } from "linkedom";
import { EngineFunction, EngineResult } from "../../types/search-engine-interface";

export const reddit: EngineFunction = async (
  query: string,
  page: number | undefined
) => {
  const params = new URLSearchParams({
    q: query,
    sort: "relevance",
    t: "all",
  });
  const response = await fetch(
    `https://old.reddit.com/search?${params}`,
    {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
    }
  );
  if (!response.ok) return [];
  const html = await response.text();
  const { document } = parseHTML(html);
  const results: EngineResult[] = [];

  document.querySelectorAll(".search-result").forEach((el) => {
    const titleLink = el.querySelector("a.search-title");
    const title = titleLink?.textContent?.trim() || "";
    const link = titleLink?.getAttribute("href");
    const content =
      el.querySelector(".search-result-body")?.textContent?.trim() ||
      "";

    if (title && link) {
      results.push({
        title,
        url: link.startsWith("http")
          ? link
          : `https://old.reddit.com${link}`,
        content: content || "",
        engine: "reddit",
      });
    }
  });

  return results;
};
