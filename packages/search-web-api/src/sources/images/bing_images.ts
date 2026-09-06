/**
 * @fileoverview Engine adapter that scrapes Bing Images search results.
 */
import { parseHTML } from "linkedom";
import { EngineFunction } from "../../types/search-engine-interface";

export const bing_images: EngineFunction = async (
  query: string,
  page: number | undefined
) => {
  const params = new URLSearchParams({
    q: query,
    async: "1",
    first: String(((page || 1) - 1) * 35 + 1),
    count: "35",
  });
  const response = await fetch(
    `https://www.bing.com/images/async?${params}`,
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
  const { document } = parseHTML(html);

  return Array.from(
    document.querySelectorAll(
      'ul.dgControl_list li, li[class*="dgControl"]'
    )
  )
    .map((element) => {
      const metadataStr = element
        .querySelector("a.iusc")
        ?.getAttribute("m");
      if (!metadataStr) return null;

      try {
        const metadata = JSON.parse(metadataStr);
        const title =
          element.querySelector("div.infnmpt a")?.textContent?.trim() ||
          metadata.t ||
          "";
        const imgFormat =
          element
            .querySelector("div.imgpt div span")
            ?.textContent?.trim() || "";
        const source =
          element
            .querySelector("div.imgpt div.lnkw a")
            ?.textContent?.trim() || "";

        return {
          url: metadata.purl,
          title,
          content: metadata.desc || source || "",
          thumbnail: metadata.turl,
          engine: "bing_images",
        };
      } catch (e) {
        return null;
      }
    })
    .filter((r) => r !== null);
};
