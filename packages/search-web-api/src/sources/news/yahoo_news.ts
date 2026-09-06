/**
 * @fileoverview Engine adapter that scrapes Yahoo News search results.
 */
import { parseHTML } from "linkedom";
import { EngineFunction } from "../../types/search-engine-interface";

export const yahoo_news: EngineFunction = async (
  query: string,
  page: number | undefined
) => {
  const url = `https://news.search.yahoo.com/search?${new URLSearchParams({
    p: query,
  }).toString()}&b=${((page || 1) - 1) * 10 + 1}`;

  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (X1; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.5",
    },
  });
  if (!response.ok) return [];
  const html = await response.text();
  const { document } = parseHTML(html);
  const results: any[] = [];

  // Parse results from Yahoo News search
  document
    .querySelectorAll('ol.searchCenterMiddle li, ol[class*="reg"] li')
    .forEach((el) => {
      const element = el;

      const link = element.querySelector("h4 a, .fz-16 a, .title a");
      let url = link?.getAttribute("href");

      if (!url) {
        return; // continue to next iteration
      }

      // Parse Yahoo's redirect URL to get the real URL
      // Yahoo URLs are like: https://r.search.yahoo.com/_ylt=...;_ylu=.../RU=.../RK=.../RS=...
      if (url.includes("r.search.yahoo.com") || url.includes("/RU=")) {
        try {
          const urlObj = new URL(url);
          const ruMatch = url.match(/\/RU=([^/]+)/);
          if (ruMatch) {
            url = decodeURIComponent(ruMatch[1]);
          } else if (urlObj.searchParams.has("url")) {
            url = urlObj.searchParams.get("url") || url;
          }
        } catch (e) {
          // If parsing fails, use URL as-is
        }
      }

      const title = link?.textContent?.trim() || "";
      const content =
        element
          .querySelector('p, .compText, div[class*="desc"]')
          ?.textContent?.trim() || "";
      const thumbnail =
        element.querySelector("img")?.getAttribute("data-src") ||
        element.querySelector("img")?.getAttribute("src") ||
        "";

      if (url && title) {
        results.push({
          url,
          title,
          content,
          thumbnail,
          engine: "yahoo_news",
        });
      }
    });

  return results;
};
