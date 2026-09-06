/**
 * @fileoverview Engine adapter that scrapes DeviantArt search results.
 */
import { parseHTML } from "linkedom";
import { EngineFunction } from "../../types/search-engine-interface";

export const deviantart: EngineFunction = async (
  query: string,
  page: number | undefined
) => {
  const params = new URLSearchParams({ q: query });
  const response = await fetch(
    `https://www.deviantart.com/search?${params}`,
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
    document.querySelectorAll("div.V_S0t_ > div > div > a")
  )
    .map((element) => {
      const premiumText = element.parentElement
        ?.querySelector("div div div")
        ?.textContent;
      if (premiumText && premiumText.includes("Watch the artist to view")) {
        return null;
      }

      const url = element.getAttribute("href");
      const title = element.getAttribute("aria-label");
      const thumbnail =
        element.querySelector("div img")?.getAttribute("src") || undefined;

      let imgSrc = element.querySelector("div img")?.getAttribute("srcset");
      if (imgSrc) {
        imgSrc = imgSrc.split(" ")[0];
        try {
          const imgUrl = new URL(imgSrc);
          const pathParts = imgUrl.pathname.split("/v1");
          if (pathParts.length > 0) {
            imgUrl.pathname = pathParts[0];
            imgSrc = imgUrl.toString();
          }
        } catch (e) {
          // If URL parsing fails, keep original
        }
      }

      if (!url || !title) {
        return null;
      }

      return {
        url,
        title,
        content: "",
        engine: "deviantart",
        thumbnail: imgSrc || thumbnail,
      };
    })
    .filter((r) => r !== null);
};
