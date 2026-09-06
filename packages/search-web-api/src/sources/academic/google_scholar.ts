/**
 * @fileoverview Engine adapter that scrapes Google Scholar search results.
 */
import { parseHTML } from "linkedom";
import { EngineFunction } from "../../types/search-engine-interface";

export const google_scholar: EngineFunction = async (
  query: string,
  page: number | undefined
) => {
  const params = new URLSearchParams({
    q: query,
    start: String(((page || 1) - 1) * 10),
    hl: "en",
  });

  const response = await fetch(
    `https://scholar.google.com/scholar?${params}`,
    {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        Cookie: "CONSENT=YES+",
      },
    }
  );

  if (!response.ok) return [];

  const text = await response.text();
  const { document } = parseHTML(text);

  return Array.from(document.querySelectorAll(".gs_r.gs_or.gs_scl"))
    .map((element) => {
      const titleLink = element.querySelector(".gs_rt a");
      const url = titleLink?.getAttribute("href") || "";
      const title = titleLink?.textContent?.trim() || "";
      const content =
        element.querySelector(".gs_rs")?.textContent?.trim() || "";
      const publicationInfo =
        element.querySelector(".gs_a")?.textContent?.trim() || "";

      return {
        url,
        title,
        content: publicationInfo
          ? `${publicationInfo} - ${content}`
          : content,
        engine: "google_scholar",
      };
    })
    .filter((r) => r.url && r.title);
};
