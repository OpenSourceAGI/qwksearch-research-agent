/**
 * @fileoverview Engine adapter that scrapes Imgur search results.
 */
import { parseHTML } from "linkedom";
import { EngineFunction } from "../../types/search-engine-interface";

export const imgur: EngineFunction = async (
  query: string,
  page: number | undefined
) => {
  const params = new URLSearchParams({
    q: query,
    qs: "thumbs",
    p: String((page || 1) - 1),
  });
  const response = await fetch(
    `https://imgur.com/search/score/all?${params}`,
    {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
    }
  );
  if (!response.ok) return [];
  const html = await response.text();

  if (!html || typeof html !== "string") {
    return [];
  }

  const { document } = parseHTML(html);

  return Array.from(
    document.querySelectorAll('div.cards div.post, div[class*="post"]')
  )
    .map((element) => {
      const link = element.querySelector("a");
      const url = link?.getAttribute("href");
      const title = link?.querySelector("img")?.getAttribute("alt") || "";
      let thumbnail = link?.querySelector("img")?.getAttribute("src") || "";

      if (!url || !thumbnail || thumbnail.length < 25) {
        return null;
      }

      const imgSrc = thumbnail.replace("b.", ".");

      return {
        url: `https://imgur.com${url}`,
        title,
        content: "",
        thumbnail,
        engine: "imgur",
      };
    })
    .filter((r) => r !== null);
};
