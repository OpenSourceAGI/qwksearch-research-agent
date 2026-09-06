/**
 * @fileoverview Engine adapter that scrapes Twitter/X search results.
 */
import { parseHTML } from "linkedom";
import { EngineFunction, EngineResult } from "../../types/search-engine-interface";

export const twitter: EngineFunction = async (
  query: string,
  page: number | undefined
) => {
  const params = new URLSearchParams({
    f: "tweets",
    q: query,
  });
  const response = await fetch(`https://nitter.net/search?${params}`, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    },
  });
  if (!response.ok) return [];
  const html = await response.text();
  const { document } = parseHTML(html);
  const results: EngineResult[] = [];

  document.querySelectorAll(".timeline-item").forEach((el) => {
    const element = el;
    const tweetLink = element.querySelector(".tweet-link");
    const username =
      element.querySelector(".username")?.textContent?.trim() || "";
    const fullname =
      element.querySelector(".fullname")?.textContent?.trim() || "";
    const content =
      element.querySelector(".tweet-content")?.textContent?.trim() ||
      "";
    const timestamp =
      element
        .querySelector(".tweet-date a")
        ?.textContent?.trim() || "";
    const stats =
      element.querySelector(".tweet-stats")?.textContent?.trim() || "";

    const href = tweetLink?.getAttribute("href");
    const url = href
      ? `https://twitter.com${href.replace("/i/web", "")}`
      : "";

    if (url && content) {
      results.push({
        url,
        title: `${fullname} (@${username})`,
        content: `${content} | ${timestamp} | ${stats}`,
        engine: "twitter",
      });
    }
  });

  return results;
};
