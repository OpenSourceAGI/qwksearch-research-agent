/**
 * @fileoverview Engine adapter that queries the Pixabay API for image search results.
 */
import { EngineFunction } from "../../types/search-engine-interface";

export const pixabay: EngineFunction = async (
  query: string,
  page: number | undefined
) => {
  const params = new URLSearchParams({
    pagi: String(page || 1),
  });
  const response = await fetch(
    `https://pixabay.com/images/search/${query}/?${params}`,
    {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Pixabay",
        "x-bootstrap-cache-miss": "1",
        "x-fetch-bootstrap": "1",
      },
      redirect: "manual",
    }
  );
  if (!response.ok) return [];
  const json = await response.json();

  if (!json || !json.page || !json.page.results) {
    return [];
  }

  return json.page.results
    .map((result: any) => {
      if (
        !result.mediaType ||
        !["photo", "illustration", "vector"].includes(result.mediaType)
      ) {
        return null;
      }

      const sources = result.sources || {};
      const thumbnail =
        (Object.values(sources)[0] as string) || "";
      const img_src =
        (Object.values(sources)[
          Object.values(sources).length - 1
        ] as string) || "";

      return {
        url: `https://pixabay.com${result.href}`,
        title: result.name || "",
        content: result.description || "",
        engine: "pixabay",
        thumbnail,
        img_src,
      };
    })
    .filter((r: any) => r !== null);
};
