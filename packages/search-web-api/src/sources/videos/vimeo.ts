/**
 * @fileoverview Engine adapter that queries the Vimeo API for video search results.
 */
import { EngineFunction } from "../../types/search-engine-interface";

export const vimeo: EngineFunction = async (
  query: string,
  page: number | undefined
) => {
  const params = new URLSearchParams({
    q: query,
    page: String(page || 1),
  });
  const response = await fetch(`https://vimeo.com/search?${params}`, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (X1; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.5",
    },
  });
  if (!response.ok) return [];
  const html = await response.text();
  const results = [] as any[];

  if (!html || typeof html !== "string") {
    return results;
  }

  try {
    // Extract JSON data from the page
    const dataMatch = html.match(/var data = ({.*?});/s);
    if (!dataMatch) {
      return results;
    }

    const parsedData = JSON.parse(dataMatch[1]);
    const filteredData = parsedData?.filtered?.data || [];

    for (const resultItem of filteredData) {
      const type = resultItem.type;
      const result = resultItem[type];

      if (!result) continue;

      const videoId = result.uri?.split("/").pop();
      if (!videoId) continue;

      const url = `https://vimeo.com/${videoId}`;
      const title = result.name || "";
      const thumbnail =
        result.pictures?.sizes?.slice(-1)[0]?.link || "";
      const publishedDate = result.created_time || "";

      results.push({
        url,
        title,
        content: publishedDate
          ? `Published: ${publishedDate.split("T")[0]}`
          : "",
        thumbnail,
        engine: "vimeo",
      });
    }
  } catch (e) {
    console.error("Error parsing Vimeo response:", e);
  }

  return results;
};
