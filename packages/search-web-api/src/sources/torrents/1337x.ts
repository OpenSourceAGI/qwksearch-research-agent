/**
 * @fileoverview Engine adapter that scrapes 1337x torrent search results.
 */
import { parseHTML } from "linkedom";
import { EngineFunction } from "../../types/search-engine-interface";

export const torrent_1337x: EngineFunction = async (
  query: string,
  page: number | undefined
) => {
  const response = await fetch(
    `https://1337x.to/search/${encodeURIComponent(query)}/${page || 1}/`,
    {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      },
    }
  );
  if (!response.ok) return [];
  const html = await response.text();
  const { document } = parseHTML(html);
  const results: any[] = [];

  document.querySelectorAll("table.table-list tbody tr").forEach((el) => {
    const element = el;
    const links = element.querySelectorAll("td.name a");
    const link = links[1] || links[0]; // Second link is usually the torrent detail page
    const url = `https://1337x.to${link?.getAttribute("href")}`;
    const title = link?.textContent?.trim() || "";
    const seeds = element.querySelector("td.seeds")?.textContent?.trim() || "";
    const leeches = element.querySelector("td.leeches")?.textContent?.trim() || "";
    const size = element.querySelector("td.size")?.textContent?.trim() || "";

    if (url && title) {
      results.push({
        url,
        title,
        content: `Size: ${size}, Seeds: ${seeds}, Leeches: ${leeches}`,
        engine: "1337x",
      });
    }
  });

  return results;
};
