/**
 * @fileoverview Engine adapter that scrapes Openclipart search results.
 */
import { parseHTML } from "linkedom";
import { EngineFunction } from "../../types/search-engine-interface";

export const openclipart: EngineFunction = async (
  query: string,
  page: number | undefined
) => {
  const params = new URLSearchParams({
    query: query,
    p: String(page || 1),
  });
  const response = await fetch(
    `https://openclipart.org/search/?${params}`,
    {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
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
    document.querySelectorAll("div.gallery div.artwork")
  )
    .map((element) => {
      const link = element.querySelector("a");
      const href = link?.getAttribute("href");
      const title = link?.querySelector("img")?.getAttribute("alt");
      const imgSrc = link?.querySelector("img")?.getAttribute("src");

      if (!href || !title || !imgSrc) {
        return null;
      }

      return {
        url: `https://openclipart.org${href}`,
        title,
        content: "",
        engine: "openclipart",
        thumbnail: `https://openclipart.org${imgSrc}`,
      };
    })
    .filter((r) => r !== null);
};
