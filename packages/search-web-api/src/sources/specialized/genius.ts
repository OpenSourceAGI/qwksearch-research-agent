/**
 * @fileoverview Engine adapter that queries the Genius API for song/lyrics search results.
 */
import { EngineFunction, EngineResult } from "../../types/search-engine-interface";

export const genius: EngineFunction = async (
  query: string,
  page: number | undefined
) => {
  const params = new URLSearchParams({
    per_page: "5",
    q: query,
  });
  const response = await fetch(
    `https://genius.com/api/search/multi?${params}`,
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

  if (data && data.response && data.response.sections) {
    data.response.sections.forEach((section: any) => {
      if (section.type === "song" || section.type === "lyric") {
        section.hits.forEach((hit: any) => {
          if (hit.result) {
            results.push({
              url: hit.result.url,
              title: hit.result.full_title,
              content: `Artist: ${hit.result.artist_names}`,
              thumbnail: hit.result.song_art_image_thumbnail_url,
              engine: "genius",
            });
          }
        });
      }
    });
  }

  return results;
};
