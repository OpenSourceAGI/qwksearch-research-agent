/**
 * @fileoverview Engine adapter that queries the CORE API for open-access academic papers (requires CORE_API_KEY).
 */
import { EngineFunction } from "../../types/search-engine-interface";

export const core: EngineFunction = async (
  query: string,
  page: number | undefined
) => {
  const apiKey = process.env.CORE_API_KEY;
  if (!apiKey) return [];

  const limit = 10;
  const offset = ((page || 1) - 1) * limit;

  const response = await fetch(
    "https://api.core.ac.uk/v3/search/works",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "User-Agent":
          "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36",
      },
      body: JSON.stringify({ q: query, limit, offset, scroll: false }),
    }
  );

  if (!response.ok) return [];

  const data = await response.json();

  if (!data || !Array.isArray(data.results)) return [];

  return data.results
    .map((r: any) => {
      const title = r.title || "";
      const doi = r.doi || "";
      const url =
        r.downloadUrl ||
        (doi ? `https://doi.org/${doi}` : "") ||
        (r.id ? `https://core.ac.uk/works/${r.id}` : "");
      const authors = (r.authors || [])
        .slice(0, 3)
        .map((a: any) => a.name)
        .filter(Boolean);
      const journal = r.journals?.[0]?.title || "";
      const abstract = (r.abstract || "").slice(0, 500);

      const content = [
        abstract,
        authors.length
          ? `Authors: ${authors.join(", ")}${
              (r.authors || []).length > 3 ? " et al." : ""
            }`
          : "",
        r.yearPublished ? `Year: ${r.yearPublished}` : "",
        journal ? `Journal: ${journal}` : "",
        doi ? `DOI: ${doi}` : "",
      ]
        .filter(Boolean)
        .join("\n");

      return { url, title, content, engine: "core" };
    })
    .filter((r: any) => r.url && r.title);
};
