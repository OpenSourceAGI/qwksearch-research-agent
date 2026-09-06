/**
 * @fileoverview Engine adapter that queries the Semantic Scholar API for academic papers.
 */
import { EngineFunction } from "../../types/search-engine-interface";

export const semantic_scholar: EngineFunction = async (
  query: string,
  page: number | undefined
) => {
  const response = await fetch(
    "https://www.semanticscholar.org/api/1/search",
    {
      method: "POST",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        queryString: query,
        page: page || 1,
        pageSize: 10,
        sort: "relevance",
        getQuerySuggestions: false,
        authors: [],
        coAuthors: [],
        venues: [],
        performTitleMatch: true,
      }),
    }
  );

  if (!response.ok) return [];

  const data = await response.json();

  if (!data.results) return [];

  return data.results.map((result: any) => {
    let url = result.primaryPaperLink?.url;
    if (!url && result.links && result.links.length > 0) {
      url = result.links[0];
    }
    if (
      !url &&
      result.alternatePaperLinks &&
      result.alternatePaperLinks.length > 0
    ) {
      url = result.alternatePaperLinks[0].url;
    }
    if (!url) {
      url = `https://www.semanticscholar.org/paper/${result.id}`;
    }

    const title = result.title?.text || "";
    const abstract = result.abstract?.text || "";

    const metadata: string[] = [];
    if (result.authors && result.authors.length > 0) {
      const authorNames = result.authors
        .map((a: any) => a.name)
        .slice(0, 3);
      metadata.push(
        `Authors: ${authorNames.join(", ")}${
          result.authors.length > 3 ? " et al." : ""
        }`
      );
    }
    if (result.year) metadata.push(`Year: ${result.year}`);
    if (result.venue) metadata.push(`Venue: ${result.venue}`);
    if (result.citationCount) metadata.push(`Citations: ${result.citationCount}`);

    const content =
      metadata.length > 0
        ? `${metadata.join(" | ")}\n\n${abstract}`
        : abstract;

    return { url, title, content, engine: "semantic_scholar" };
  });
};
