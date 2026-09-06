/**
 * @fileoverview Engine adapter that scrapes IMDb search results.
 */
import { parseHTML } from "linkedom";
import { EngineFunction, EngineResult } from "../../types/search-engine-interface";

export const imdb: EngineFunction = async (
  query: string,
  page: number | undefined
) => {
  const params = new URLSearchParams({
    q: query,
    s: "all",
  });
  const response = await fetch(
    `https://www.imdb.com/find/?${params}`,
    {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
      },
    }
  );
  if (!response.ok) return [];
  const html = await response.text();
  const { document } = parseHTML(html);
  const results: EngineResult[] = [];

  document
    .querySelectorAll(".ipc-metadata-list-summary-item")
    .forEach((el) => {
      const element = el;
      const link = element.querySelector(
        "a.ipc-metadata-list-summary-item__t"
      );
      const url = `https://www.imdb.com${link?.getAttribute("href")}`;
      const title = link?.textContent?.trim() || "";
      const content =
        element
          .querySelector(".ipc-metadata-list-summary-item__li")
          ?.textContent?.trim() || "";
      const thumbnail =
        element.querySelector("img")?.getAttribute("src") || "";

      if (url && title) {
        results.push({
          url,
          title,
          content,
          thumbnail,
          engine: "imdb",
        });
      }
    });

  return results;
};
