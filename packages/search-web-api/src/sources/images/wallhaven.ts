/**
 * @fileoverview Engine adapter that queries the Wallhaven API for wallpaper search results.
 */
import { EngineFunction } from "../../types/search-engine-interface";

export const wallhaven: EngineFunction = async (
  query: string,
  page: number | undefined
) => {
  const params = new URLSearchParams({
    q: query,
    page: String(page || 1),
    purity: "100",
  });
  const response = await fetch(
    `https://wallhaven.cc/api/v1/search?${params}`,
    {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      },
    }
  );
  if (!response.ok) return [];
  const json = await response.json();

  if (!json || !json.data) {
    return [];
  }

  return json.data.map((result: any) => {
    const fileSize = result.file_size
      ? `${(result.file_size / 1024 / 1024).toFixed(2)} MB`
      : "";
    const content = [
      `${result.category} / ${result.purity}`,
      result.resolution ? `Resolution: ${result.resolution}` : "",
      fileSize ? `Size: ${fileSize}` : "",
      result.file_type ? `Format: ${result.file_type}` : "",
    ]
      .filter(Boolean)
      .join(" | ");

    return {
      url: result.url,
      title: result.resolution || "Wallpaper",
      content,
      engine: "wallhaven",
      img_src: result.path,
      thumbnail: result.thumbs?.small || result.thumbs?.original,
    };
  });
};
