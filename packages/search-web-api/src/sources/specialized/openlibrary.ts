/**
 * @fileoverview Engine adapter that queries the Open Library API for book search results.
 */
import { EngineFunction, EngineResult } from "../../types/search-engine-interface";

export const openlibrary: EngineFunction = async (
  query: string,
  page: number | undefined
) => {
  const params = new URLSearchParams({
    q: query,
    page: String(page || 1),
    limit: "10",
    fields: "*",
  });
  const response = await fetch(
    `https://openlibrary.org/search.json?${params}`,
    {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      },
      signal: AbortSignal.timeout(10000),
    }
  );
  if (!response.ok) return [];
  const data = await response.json();
  const results: EngineResult[] = [];

  if (!data || !data.docs) {
    return results;
  }

  for (const item of data.docs) {
    const thumbnail = item.lending_identifier_s
      ? `https://archive.org/services/img/${item.lending_identifier_s}`
      : "";

    const authors = item.author_name ? item.author_name.join(", ") : "";
    const publishYear = item.first_publish_year || "";
    const isbn = item.isbn ? item.isbn.slice(0, 3).join(", ") : "";

    const content = [
      item.first_sentence ? item.first_sentence.join(" / ") : "",
      authors ? `Authors: ${authors}` : "",
      publishYear ? `First published: ${publishYear}` : "",
      isbn ? `ISBN: ${isbn}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    results.push({
      url: `https://openlibrary.org${item.key}`,
      title: item.title,
      content,
      engine: "openlibrary",
      thumbnail,
    });
  }

  return results;
};
