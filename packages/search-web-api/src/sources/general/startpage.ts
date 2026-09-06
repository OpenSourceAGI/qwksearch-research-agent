/**
 * @fileoverview Engine adapter that scrapes Startpage web search results.
 */
import { parseHTML } from "linkedom";
import { EngineFunction } from "../../types/search-engine-interface";

export const startpage: EngineFunction = async (
  query: string,
  page: number | undefined
) => {
  const formData = new URLSearchParams();
  formData.append("query", query);
  formData.append("page", String(page || 1));

  const response = await fetch("https://www.startpage.com/sp/search", {
    method: "POST",
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: formData.toString(),
  });
  if (!response.ok) return [];
  const htmlString = await response.text();
  const { document } = parseHTML(htmlString);

  return Array.from(
    document.querySelectorAll(".w-gl__result")
  )
    .map((element) => {
      const link = element.querySelector(".w-gl__result-title");
      const url = link?.getAttribute("href") || "";
      const title = link?.querySelector("h3")?.textContent?.trim() || "";
      const content =
        element.querySelector(".w-gl__description")?.textContent?.trim() ||
        "";

      return {
        url,
        title,
        content,
        engine: "startpage",
      };
    })
    .filter((r) => r.url && r.title);
};
