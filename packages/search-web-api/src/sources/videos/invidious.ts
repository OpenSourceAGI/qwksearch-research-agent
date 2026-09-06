/**
 * @fileoverview Engine adapter that queries public Invidious instances for YouTube video search results.
 */
import { EngineFunction } from "../../types/search-engine-interface";

// Public Invidious instances - user can configure their own
const DEFAULT_INSTANCES = [
  "https://invidious.nerdvpn.de",
  "https://invidious.private.coffee",
  "https://inv.nadeko.net",
];

export const invidious: EngineFunction = async (
  query: string,
  page: number | undefined
) => {
  const baseUrl = DEFAULT_INSTANCES[0];
  const params = new URLSearchParams({
    q: query,
    page: String(page || 1),
  });

  const response = await fetch(`${baseUrl}/api/v1/search?${params}`, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    },
  });
  if (!response.ok) return [];
  const json = await response.json();
  const results = [] as any[];

  if (!json || !Array.isArray(json)) {
    return results;
  }

  for (const result of json) {
    if (result.type !== "video") {
      continue;
    }

    const videoId = result.videoId;
    if (!videoId) continue;

    const url = `${baseUrl}/watch?v=${videoId}`;

    // Find thumbnail
    const thumbs = result.videoThumbnails || [];
    let thumbnail = "";
    const sdThumb = thumbs.find((t: any) => t.quality === "sddefault");
    if (sdThumb) {
      thumbnail = sdThumb.url;
      // Handle partial URLs
      if (thumbnail && !thumbnail.startsWith("http")) {
        thumbnail = baseUrl + thumbnail;
      }
    }

    // Format duration
    const lengthSeconds = result.lengthSeconds || 0;
    const hours = Math.floor(lengthSeconds / 3600);
    const minutes = Math.floor((lengthSeconds % 3600) / 60);
    const seconds = lengthSeconds % 60;
    const length =
      hours > 0
        ? `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
        : `${minutes}:${seconds.toString().padStart(2, "0")}`;

    const content = [
      result.description || "",
      result.author ? `By: ${result.author}` : "",
      result.viewCount ? `Views: ${result.viewCount.toLocaleString()}` : "",
      length ? `Duration: ${length}` : "",
    ]
      .filter(Boolean)
      .join(" | ");

    results.push({
      url,
      title: result.title || "",
      content,
      engine: "invidious",
      thumbnail,
      iframe_src: `${baseUrl}/embed/${videoId}`,
    });
  }

  return results;
};
