/**
 * @fileoverview Engine adapter that scrapes Goodreads search results.
 */
import { parseHTML } from "linkedom";
import { EngineFunction, EngineResult } from "../../types/search-engine-interface";

export const goodreads: EngineFunction = async (
  query: string,
  page: number | undefined
) => {
  const params = new URLSearchParams({
    q: query,
    page: String(page || 1),
  });
  const response = await fetch(
    `https://www.goodreads.com/search?${params}`,
    {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      },
    }
  );
  if (!response.ok) return [];
  const html = await response.text();
  const results: EngineResult[] = [];

  if (!html || typeof html !== "string") {
    return results;
  }

  const { document } = parseHTML(html);

  document.querySelectorAll("table tr").forEach((element) => {
    const rowElem = element;

    const $link = rowElem.querySelector("a.bookTitle");
    const href = $link?.getAttribute("href");
    const title = $link?.textContent?.trim() || "";

    if (!href || !title) return;

    const thumbnail =
      rowElem.querySelector("img.bookCover")?.getAttribute("src") ||
      undefined;
    const author =
      rowElem.querySelector("a.authorName")?.textContent?.trim() || "";
    const info =
      rowElem.querySelector("span.uitext")?.textContent?.trim() || "";

    const content = [info, author ? `Author: ${author}` : ""]
      .filter(Boolean)
      .join(" | ");

    results.push({
      url: `https://www.goodreads.com${href}`,
      title,
      content,
      engine: "goodreads",
      thumbnail,
    });
  });

  return results;
};
