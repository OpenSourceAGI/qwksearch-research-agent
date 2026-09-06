/**
 * @fileoverview Engine adapter that queries the Internet Archive API for search results.
 */
import { EngineFunction, EngineResult } from "../../types/search-engine-interface";

export const archive: EngineFunction = async (
  query: string,
  page: number | undefined
) => {
  const params = new URLSearchParams({
    q: query,
    "fl[]": "identifier,title,description,mediatype,downloads",
    "sort[]": "",
    rows: "50",
    page: String(page || 1),
    output: "json",
  });
  const response = await fetch(
    `https://archive.org/advancedsearch.php?${params}`,
    {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      },
    }
  );
  if (!response.ok) return [];
  const data = await response.json();
  const results: EngineResult[] = [];

  if (data && data.response && data.response.docs) {
    data.response.docs.forEach((doc: any) => {
      const identifier = doc.identifier;
      const title = doc.title || identifier;
      const description = doc.description || "No description available";
      const mediatype = doc.mediatype || "unknown";
      const downloads = doc.downloads || 0;
      const url = `https://archive.org/details/${identifier}`;

      results.push({
        url,
        title,
        content: `${description} | Type: ${mediatype} | Downloads: ${downloads}`,
        thumbnail: `https://archive.org/services/img/${identifier}`,
        engine: "archive",
      });
    });
  }

  return results;
};
