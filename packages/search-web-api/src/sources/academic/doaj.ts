/**
 * @fileoverview Engine adapter that queries the Directory of Open Access Journals (DOAJ) API.
 */
import { EngineFunction } from "../../types/search-engine-interface";

export const doaj: EngineFunction = async (
  query: string,
  page: number | undefined
) => {
  const params = new URLSearchParams({
    pageSize: "10",
    page: String(page || 1),
    sort: "created_date:desc",
  });

  const response = await fetch(
    `https://doaj.org/api/v2/search/articles/${encodeURIComponent(query)}?${params}`,
    {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36",
        Accept: "application/json",
      },
    }
  );

  if (!response.ok) return [];

  const data = await response.json();

  if (!data || !Array.isArray(data.results)) return [];

  return data.results
    .map((r: any) => {
      const bib = r.bibjson || {};
      const title = bib.title || "";
      const doi =
        bib.identifier?.find((i: any) => i.type === "doi")?.id || "";
      const link =
        bib.link?.find((l: any) => l.type === "fulltext")?.url || "";
      const url = link || (doi ? `https://doi.org/${doi}` : "");
      const authors = (bib.author || [])
        .slice(0, 3)
        .map((a: any) => a.name)
        .filter(Boolean);
      const journal = bib.journal?.title || "";
      const abstract = (bib.abstract || "").slice(0, 500);

      const content = [
        abstract,
        authors.length
          ? `Authors: ${authors.join(", ")}${
              (bib.author || []).length > 3 ? " et al." : ""
            }`
          : "",
        bib.year ? `Year: ${bib.year}` : "",
        journal ? `Journal: ${journal}` : "",
        doi ? `DOI: ${doi}` : "",
      ]
        .filter(Boolean)
        .join("\n");

      return { url, title, content, engine: "doaj" };
    })
    .filter((r: any) => r.url && r.title);
};
