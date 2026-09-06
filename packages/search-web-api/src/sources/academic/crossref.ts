/**
 * @fileoverview Engine adapter that queries the Crossref API for scholarly work metadata.
 */
import { EngineFunction } from "../../types/search-engine-interface";

export const crossref: EngineFunction = async (
  query: string,
  page: number | undefined
) => {
  const params = new URLSearchParams({
    query: query,
    offset: String(20 * ((page || 1) - 1)),
  });

  const response = await fetch(
    `https://api.crossref.org/works?${params}`,
    {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    }
  );

  if (!response.ok) return [];

  const data = await response.json();

  if (!data || !data.message || !data.message.items) return [];

  return data.message.items
    .filter((record: any) => record.type !== "component")
    .map((record: any) => {
      let title = "";
      let journal = "";

      if (record.type === "book-chapter") {
        title = record["container-title"]?.[0] || "";
        if (
          record.title?.[0] &&
          record.title[0].toLowerCase().trim() !==
            title.toLowerCase().trim()
        ) {
          title += ` (${record.title[0]})`;
        }
      } else {
        title =
          record.title?.[0] || record["container-title"]?.[0] || "";
        journal =
          record["container-title"]?.[0] && record.title?.[0]
            ? record["container-title"][0]
            : "";
      }

      const authors = (record.author || [])
        .map((a: any) => `${a.given || ""} ${a.family || ""}`.trim())
        .filter((a: string) => a)
        .join(", ");

      const content = [
        record.abstract || "",
        journal ? `Journal: ${journal}` : "",
        authors ? `Authors: ${authors}` : "",
        record.publisher ? `Publisher: ${record.publisher}` : "",
        record.DOI ? `DOI: ${record.DOI}` : "",
      ]
        .filter(Boolean)
        .join("\n");

      return {
        url: record.URL || `https://doi.org/${record.DOI}` || "",
        title,
        content,
        engine: "crossref",
      };
    })
    .filter((r: any) => r.url && r.title);
};
