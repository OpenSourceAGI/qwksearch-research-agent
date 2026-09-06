/**
 * @fileoverview Engine adapter that queries the Dailymotion API for video search results.
 */
import { EngineFunction } from "../../types/search-engine-interface";

export const dailymotion: EngineFunction = async (
  query: string,
  page: number | undefined
) => {
  const params = new URLSearchParams({
    search: query,
    family_filter: "false",
    thumbnail_ratio: "original",
    languages: "en",
    page: String(page || 1),
    password_protected: "false",
    private: "false",
    sort: "relevance",
    limit: "10",
    fields:
      "allow_embed,description,title,created_time,duration,url,thumbnail_360_url,id",
  });
  const response = await fetch(
    `https://api.dailymotion.com/videos?${params}`,
    {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (X1; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    }
  );
  if (!response.ok) return [];
  const jsonData = await response.json();
  const results = [] as any[];

  if (jsonData.error) {
    console.error("Dailymotion API error:", jsonData.error.message);
    return results;
  }

  const videoList = jsonData.list || [];

  for (const video of videoList) {
    const title = video.title || "";
    const url = video.url || "";
    let content = video.description || "";

    // Strip HTML tags from description
    content = content.replace(/<[^>]*>/g, "").trim();

    // Truncate if too long
    if (content.length > 300) {
      content = content.substring(0, 300) + "...";
    }

    // Format duration
    let duration = "";
    if (video.duration) {
      const hours = Math.floor(video.duration / 3600);
      const minutes = Math.floor((video.duration % 3600) / 60);
      const seconds = video.duration % 60;

      if (hours > 0) {
        duration = `${String(hours).padStart(2, "0")}:${String(
          minutes
        ).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
      } else {
        duration = `${String(minutes).padStart(2, "0")}:${String(
          seconds
        ).padStart(2, "0")}`;
      }
    }

    // Format published date
    const publishedDate = video.created_time
      ? new Date(video.created_time * 1000).toISOString().split("T")[0]
      : "";

    const metadata = [
      publishedDate ? `Published: ${publishedDate}` : "",
      duration ? `Duration: ${duration}` : "",
    ]
      .filter(Boolean)
      .join(" | ");

    const fullContent = metadata ? `${metadata}\n${content}` : content;

    // Get thumbnail
    let thumbnail = video.thumbnail_360_url || "";
    if (thumbnail) {
      thumbnail = thumbnail.replace("http://", "https://");
    }

    results.push({
      url,
      title,
      content: fullContent,
      thumbnail,
      engine: "dailymotion",
    });
  }

  return results;
};
