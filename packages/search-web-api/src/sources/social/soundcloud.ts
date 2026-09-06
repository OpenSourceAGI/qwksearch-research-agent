/**
 * @fileoverview Engine adapter that scrapes SoundCloud search results.
 */
import { parseHTML } from "linkedom";
import { EngineFunction, EngineResult } from "../../types/search-engine-interface";

export const soundcloud: EngineFunction = async (
  query: string,
  page: number | undefined
) => {
  const params = new URLSearchParams({ q: query });
  const response = await fetch(`https://soundcloud.com/search?${params}`, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    },
  });
  if (!response.ok) return [];
  const html = await response.text();
  const { document } = parseHTML(html);
  const results: EngineResult[] = [];

  // SoundCloud uses dynamic content, so we'll try to extract from initial HTML
  document
    .querySelectorAll("article, .searchList__item")
    .forEach((el) => {
      const element = el;
      const titleLink = element.querySelector(
        'a[itemprop="url"], h2 a'
      );
      const title =
        element
          .querySelector('[itemprop="name"], h2')
          ?.textContent?.trim() || "";
      const artist =
        element
          .querySelector('[itemprop="byArtist"], .soundTitle__username')
          ?.textContent?.trim() || "";
      const href = titleLink?.getAttribute("href");
      const url = href
        ? href.startsWith("http")
          ? href
          : `https://soundcloud.com${href}`
        : "";
      const plays =
        element
          .querySelector(".sc-ministats-plays, .soundStats__plays")
          ?.textContent?.trim() || "";
      const duration =
        element
          .querySelector(
            '.soundTitle__tagContent time, [itemprop="duration"]'
          )
          ?.textContent?.trim() || "";

      if (url && title) {
        results.push({
          url,
          title: `${title}${artist ? " - " + artist : ""}`,
          content: `${plays ? "Plays: " + plays : ""} ${duration ? "| Duration: " + duration : ""}`,
          engine: "soundcloud",
        });
      }
    });

  return results;
};
