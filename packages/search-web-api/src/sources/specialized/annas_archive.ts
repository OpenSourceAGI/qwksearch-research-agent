/**
 * @fileoverview Engine adapter that scrapes Anna's Archive search results, trying multiple mirror domains.
 */
import { parseHTML } from "linkedom";
import { EngineFunction, EngineResult } from "../../types/search-engine-interface";

const baseDomains = [
  "annas-archive.gl",
  "annas-archive.gd",
  "annas-archive.pk",
];

export const annas_archive: EngineFunction = async (
  query: string,
  page: number | undefined,
  baseDomain: number = 0,
) => {
  const params = new URLSearchParams({
    q: query,
    page: String(page || 1),
  });

  let response: Response;
  try {
    response = await fetch(
      `https://${baseDomains[baseDomain]}/search?${params}`,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        },
        signal: AbortSignal.timeout(10000),
      }
    );
  } catch (error) {
    if (baseDomain + 1 < baseDomains.length) {
      return await annas_archive(query, page, baseDomain + 1);
    }
    throw error;
  }

  if (!response.ok) {
    if (baseDomain + 1 < baseDomains.length) {
      return await annas_archive(query, page, baseDomain + 1);
    }
    return [];
  }

  const html = await response.text();
  const results: EngineResult[] = [];

  if (!html || typeof html !== "string") {
    return results;
  }

  const { document } = parseHTML(html);

  document
    .querySelectorAll("main div.js-aarecord-list-outer > div")
    .forEach((element) => {
      const elElem = element;

      const href = elElem.querySelector("a")?.getAttribute("href");
      if (!href) return;

      const url = "https://" + baseDomains[baseDomain] + href;
      const title =
        elElem.querySelector('a[href^="/md5"]')?.textContent?.trim() ||
        "";
      const author =
        elElem.querySelector('a[href^="/search"]')?.textContent?.trim() ||
        "";
      const publisher =
        elElem
          .querySelectorAll('a[href^="/search"]')[1]
          ?.textContent?.trim() || "";
      const description =
        elElem.querySelector("div.relative")?.textContent?.trim() || "";
      const thumbnail =
        elElem.querySelector("img")?.getAttribute("src") || undefined;

      const content = [
        description,
        author ? `Author: ${author}` : "",
        publisher ? `Publisher: ${publisher}` : "",
      ]
        .filter(Boolean)
        .join("\n");

      results.push({
        url,
        title,
        content,
        engine: "annas_archive",
        thumbnail,
      });
    });

  return results;
};
