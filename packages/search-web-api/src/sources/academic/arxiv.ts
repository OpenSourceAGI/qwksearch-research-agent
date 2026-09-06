/**
 * @fileoverview Engine adapter that queries the arXiv API for academic paper search results.
 */
import { parseHTML } from "linkedom";
import { EngineFunction } from "../../types/search-engine-interface";

export const arxiv: EngineFunction = async (
  query: string,
  page: number | undefined
) => {
  const params = new URLSearchParams({
    search_query: "all:" + query,
    start: String(((page || 1) - 1) * 10),
    max_results: "10",
  });

  const response = await fetch(
    `https://export.arxiv.org/api/query?${params}`,
    {
      headers: {
        "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36",
        Accept: "application/atom+xml",
      },
    }
  );

  if (!response.ok) return [];

  const text = await response.text();
  const { document } = parseHTML(text);

  return Array.from(document.querySelectorAll("entry"))
    .map((entry) => {
      const title =
        entry
          .querySelector("title")
          ?.textContent?.replace(/\s+/g, " ")
          .trim() || "";
      const url = entry.querySelector("id")?.textContent?.trim() || "";
      const abstract = (
        entry
          .querySelector("summary")
          ?.textContent?.replace(/\s+/g, " ")
          .trim() || ""
      ).substring(0, 500);
      const authors = Array.from(entry.querySelectorAll("author name"))
        .map((n) => n.textContent?.trim())
        .filter(Boolean);
      const published = entry
        .querySelector("published")
        ?.textContent?.split("T")[0];
      const categories = Array.from(entry.querySelectorAll("category"))
        .map((cat) => cat.getAttribute("term"))
        .filter(Boolean);
      const meta = [
        authors.length &&
          `Authors: ${authors.slice(0, 3).join(", ")}${
            authors.length > 3 ? " et al." : ""
          }`,
        published && `Published: ${published}`,
        categories.length &&
          `Categories: ${categories.slice(0, 3).join(", ")}`,
      ]
        .filter(Boolean)
        .join(" | ");

      return {
        url,
        title,
        content: meta ? `${meta}\n\n${abstract}` : abstract,
        engine: "arxiv",
      };
    })
    .filter((r) => r.url && r.title);
};
