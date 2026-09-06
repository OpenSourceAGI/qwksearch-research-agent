/**
 * @fileoverview Engine adapter that scrapes Google Images search results.
 */
import { EngineFunction } from "../../types/search-engine-interface";

export const google_images: EngineFunction = async (
  query: string,
  page: number | undefined
) => {
  const params = new URLSearchParams({
    q: query,
    tbm: "isch",
    asearch: "isch",
    hl: "en",
    gl: "US",
    async: `_fmt:json,p:1,ijn:${(page || 1) - 1}`,
  });
  const response = await fetch(
    `https://www.google.com/search?${params}`,
    {
      headers: {
        "User-Agent":
          "NSTN/3.60.474802233.release Dalvik/2.1.0 (Linux; U; Android 12; US) gzip",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        Cookie: "CONSENT=YES+; SOCS=CAESBQgYEgAgAA==",
      },
    }
  );
  if (!response.ok) return [];
  const html = await response.text();

  if (!html || typeof html !== "string") {
    return [];
  }

  try {
    const jsonStart = html.indexOf('{"ischj":');
    if (jsonStart === -1) {
      return [];
    }

    const jsonData = JSON.parse(html.substring(jsonStart));
    const metadata = jsonData?.ischj?.metadata || [];

    return metadata
      .map((item: any) => {
        if (!item?.result || !item?.original_image) {
          return null;
        }

        const result = item.result;
        const originalImage = item.original_image;
        const thumbnail = item.thumbnail;

        const sourceParts: string[] = [];
        if (result.site_title) {
          sourceParts.push(result.site_title);
        }

        const author = result.iptc?.creator;
        if (author && Array.isArray(author)) {
          sourceParts.push(`Author: ${author.join(", ")}`);
        }

        const copyright = result.iptc?.copyright_notice;
        if (copyright) {
          sourceParts.push(copyright);
        }

        if (result.freshness_date) {
          sourceParts.push(result.freshness_date);
        }

        const fileSize = item.gsa?.file_size;
        if (fileSize) {
          sourceParts.push(`(${fileSize})`);
        }

        const resolution = `${originalImage.width} x ${originalImage.height}`;

        const content = [
          item.text_in_grid?.snippet || "",
          sourceParts.join(" | "),
          `Resolution: ${resolution}`,
        ]
          .filter(Boolean)
          .join("\n");

        return {
          url: result.referrer_url,
          title: result.page_title || "",
          content,
          thumbnail: thumbnail?.url,
          engine: "google_images",
        };
      })
      .filter((r: any) => r !== null);
  } catch (e) {
    console.error("Error parsing Google Images response:", e);
    return [];
  }
};
