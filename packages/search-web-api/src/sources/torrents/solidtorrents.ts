/**
 * @fileoverview Engine adapter that scrapes SolidTorrents search results.
 */
import { parseHTML } from "linkedom";
import { EngineFunction } from "../../types/search-engine-interface";

export const solidtorrents: EngineFunction = async (
  query: string,
  page: number | undefined
) => {
  const params = new URLSearchParams({
    q: query,
    page: String(page || 1),
  });
  const response = await fetch(
    `https://solidtorrents.to/search?${params}`,
    {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      },
    }
  );
  if (!response.ok) return [];
  const data = await response.text();
  const results: any[] = [];

  if (!data || typeof data !== "string") {
    return results;
  }

  const { document } = parseHTML(data);

  document.querySelectorAll("li.search-result").forEach((element) => {
    const elElem = element;

    const torrentfile = elElem.querySelector("a.dl-torrent")?.getAttribute("href");
    const magnet = elElem.querySelector("a.dl-magnet")?.getAttribute("href");

    if (!torrentfile || !magnet) {
      return; // skip results without torrent links
    }

    const title = elElem.querySelector("h5.title")?.textContent?.trim() || "";
    const url = elElem.querySelector("h5.title a")?.getAttribute("href");
    const category = elElem.querySelector("a.category")?.textContent?.trim() || "";

    const stats = Array.from(elElem.querySelectorAll(".stats div")).map(
      (el) => el.textContent?.trim() || ""
    );

    const content = [
      category ? `Category: ${category}` : "",
      stats[1] ? `Size: ${stats[1]}` : "",
      stats[3] ? `Seeds: ${stats[3]}` : "",
      stats[2] ? `Leeches: ${stats[2]}` : "",
      stats[4] ? `Date: ${stats[4]}` : "",
    ]
      .filter(Boolean)
      .join(" | ");

    results.push({
      url: `https://solidtorrents.to${url}`,
      title,
      content,
      engine: "solidtorrents",
    });
  });

  return results;
};
