/**
 * @fileoverview Engine adapter that queries the PeerTube API for video search results.
 */
import { EngineFunction } from "../../types/search-engine-interface";

export const peertube: EngineFunction = async (
  query: string,
  page: number | undefined
) => {
  const baseUrl = "https://peer.tube";
  const start = ((page || 1) - 1) * 10;
  const params = new URLSearchParams({
    search: query,
    searchTarget: "search-index",
    resultType: "videos",
    start: String(start),
    count: "10",
    sort: "-match",
    nsfw: "false",
  });

  const response = await fetch(`${baseUrl}/api/v1/search/videos?${params}`, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    },
  });
  if (!response.ok) return [];
  const json = await response.json();
  const results = [] as any[];

  if (!json || !json.data) {
    return results;
  }

  for (const result of json.data) {
    const channel = result.channel || {};
    const account = result.account || {};

    // Format duration
    const duration = result.duration || 0;
    const hours = Math.floor(duration / 3600);
    const minutes = Math.floor((duration % 3600) / 60);
    const seconds = duration % 60;
    const length =
      hours > 0
        ? `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
        : `${minutes}:${seconds.toString().padStart(2, "0")}`;

    const metadata = [
      channel.displayName,
      `${channel.name}@${channel.host}`,
      result.tags ? result.tags.join(", ") : "",
    ]
      .filter(Boolean)
      .join(" | ");

    const content = [
      result.description || "",
      `Views: ${result.views?.toLocaleString() || 0}`,
      length ? `Duration: ${length}` : "",
      metadata,
    ]
      .filter(Boolean)
      .join("\n");

    results.push({
      url: result.url,
      title: result.name,
      content,
      engine: "peertube",
      thumbnail: result.thumbnailUrl || result.previewUrl,
      iframe_src: result.embedUrl,
      author: account.displayName,
    });
  }

  return results;
};
