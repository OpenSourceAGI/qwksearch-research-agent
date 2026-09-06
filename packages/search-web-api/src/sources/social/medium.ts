/**
 * @fileoverview Engine adapter that scrapes Medium search results.
 */
import { parseHTML } from "linkedom";
import { EngineFunction, EngineResult } from "../../types/search-engine-interface";

export const medium: EngineFunction = async (
  query: string,
  page: number | undefined
) => {
  const params = new URLSearchParams({ q: query });
  const response = await fetch(`https://medium.com/search?${params}`, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    },
  });
  if (!response.ok) return [];
  const html = await response.text();
  const { document } = parseHTML(html);
  const results: EngineResult[] = [];

  // Medium uses dynamic content, so we'll parse what we can from the initial HTML
  document.querySelectorAll("article").forEach((el) => {
    const element = el;
    const titleLink = element.querySelector("h2 a, h3 a");
    const title = titleLink?.textContent?.trim() || "";
    const href = titleLink?.getAttribute("href");
    const url = href
      ? href.startsWith("http")
        ? href
        : `https://medium.com${href}`
      : "";
    const content = element.querySelector("p")?.textContent?.trim() || "";
    const author =
      element
        .querySelector('a[rel="author"]')
        ?.textContent?.trim() || "";
    const readTime =
      element
        .querySelector('[aria-label*="read"]')
        ?.textContent?.trim() || "";

    if (url && title) {
      results.push({
        url,
        title,
        content: `${content} | By ${author || "Unknown"} | ${readTime || ""}`,
        engine: "medium",
      });
    }
  });

  return results;
};
