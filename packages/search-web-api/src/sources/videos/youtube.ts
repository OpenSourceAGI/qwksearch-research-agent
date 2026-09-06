/**
 * @fileoverview Engine adapter that queries YouTube video search via public Invidious instances, with fallback across multiple instances.
 */
import { EngineFunction } from "../../types/search-engine-interface";

// Multiple Invidious instances for fallback
const INVIDIOUS_INSTANCES = [
  "https://inv.nadeko.net",
  "https://invidious.privacyredirect.com",
  "https://yewtu.be",
  "https://invidious.nerdvpn.de",
  "https://inv.riverside.rocks",
];

async function tryInvidiousInstances(
  query: string,
  page: number | undefined
): Promise<any> {
  for (const instance of INVIDIOUS_INSTANCES) {
    try {
      const params = new URLSearchParams({
        q: query,
        page: String(page || 1),
        type: "video",
      });
      const response = await fetch(`${instance}/api/v1/search?${params}`, {
        headers: {
          "User-Agent": "HonoxSearX/1.0",
        },
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) continue;
      const json = await response.json();
      const results = [] as any[];

      if (Array.isArray(json)) {
        json.forEach((item: any) => {
          if (item.type === "video") {
            const duration = item.lengthSeconds
              ? `${Math.floor(item.lengthSeconds / 60)}:${String(item.lengthSeconds % 60).padStart(2, "0")}`
              : "";
            const views = item.viewCount
              ? item.viewCount.toLocaleString()
              : "";
            const published = item.publishedText || "";

            results.push({
              url: `https://www.youtube.com/watch?v=${item.videoId}`,
              title: item.title,
              content: `${item.description || ""} | ${duration} | ${views} views | ${published}`.trim(),
              thumbnail:
                item.videoThumbnails && item.videoThumbnails.length > 0
                  ? item.videoThumbnails[0].url
                  : undefined,
              engine: "youtube",
            });
          }
        });
      }

      // If successful, return the result
      if (results.length > 0) {
        return results;
      }
    } catch (error) {
      // Try next instance
      continue;
    }
  }

  // All instances failed, return empty array
  return [];
}

export const youtube: EngineFunction = async (
  query: string,
  page: number | undefined
) => {
  return await tryInvidiousInstances(query, page);
};
