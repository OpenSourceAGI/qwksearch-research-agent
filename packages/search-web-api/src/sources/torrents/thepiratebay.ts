/**
 * @fileoverview Engine adapter that scrapes The Pirate Bay search results.
 */
import { parseHTML } from "linkedom";
import { EngineFunction } from "../../types/search-engine-interface";

export const thepiratebay: EngineFunction = async (
  query: string,
  page: number | undefined
) => {
  const params = new URLSearchParams({
    q: query,
    page: String((page || 1) - 1),
  });
  const response = await fetch(
    `https://thepiratebay.org/search.php?${params}`,
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

  document.querySelectorAll("#searchResult tbody tr").forEach((el) => {
    const element = el;
    const titleLink = element.querySelector("td.vertTh a.detLink");
    const magnetLink = element.querySelector('a[href^="magnet:"]');
    const title = titleLink?.textContent?.trim() || "";
    const url = magnetLink?.getAttribute("href") || "";
    const descElement = element.querySelector("font.detDesc");
    const descText = descElement?.textContent?.trim() || "";

    // Extract size, uploader, and date from description
    const sizeMatch = descText.match(/Size\s+([^,]+)/i);
    const uploaderMatch = descText.match(/ULed by\s+([^,]+)/i);
    const size = sizeMatch ? sizeMatch[1] : "Unknown";
    const uploader = uploaderMatch ? uploaderMatch[1] : "Unknown";

    // Get seeders and leechers
    const tds = element.querySelectorAll("td");
    const seeders = tds[2]?.textContent?.trim() || "";
    const leechers = tds[3]?.textContent?.trim() || "";

    if (url && title) {
      results.push({
        url,
        title,
        content: `Size: ${size}, Seeds: ${seeders}, Leeches: ${leechers}, Uploader: ${uploader}`,
        engine: "thepiratebay",
      });
    }
  });

  return results;
};
