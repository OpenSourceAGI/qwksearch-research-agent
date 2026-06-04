/**
 * @fileoverview Orchestrator for extracting high-quality citations (author, date, title, source) from HTML.
 * Validates names and sources against known patterns and benchmarks.
 */
import { parseHTML } from "linkedom";
import { extractAuthor } from "./extract-author";
import { extractDateQuick } from "./extract-date/extract-date-quick";
import { extractDate } from "./extract-date/extract-date";
import { extractSource } from "./extract-source";
import { extractTitle } from "./extract-title";
import { extractCiteFromMetadata } from "./metadata-to-cite";
import { extractHumanName } from "./human-names-recognize";
import { parseDate } from "chrono-node";

export interface ExtractCiteResult {
  author?: string;
  author_cite?: string;
  date?: string;
  title?: string;
  source?: string;
}

export interface ExtractCiteOptions {
  url?: string;
}

/**
 * ### \u1f4da\u1f48e Extract Expert Excerpt
 * <img width="350px" src="https://i.imgur.com/4GOOM9s.jpeg" />
 *
 * Extract author, date, source, and title from HTML using meta tags
 * and common class names. Validates human name from author string to check
 * against common list of 90k first names, last names,and organizations to infer
 * if it should be reversed starting by author last name (accounting for affixes/titles),
 * since organizations are not reversed.
 * [Article Extraction Benchmark](https://github.com/scrapinghub/article-extraction-benchmark?tab=readme-ov-file#results)
 * @param {Document | string} document dom object or html string with article content
 * @param {ExtractCiteOptions} [options={}]
 * @returns {ExtractCiteResult | null} An object containing extracted citation information.
 * @category Extract
 * @author [vtempest (2025)](https://github.com/vtempest)
 */
export function extractCite(
  document: Document | string,
  options: ExtractCiteOptions = {}
) {
  const { url = "" } = options;

  if (!document) return null;

  //if passing in html string, convert to dom object
  if (typeof document === "string") document = parseHTML(document)?.document;

  var { author, date, title, source } = extractCiteFromMetadata(document);

  if (author?.length < 3 || author?.length > 100) author = null;

  var { author_cite, author_short, author_type } =
    extractAuthor(document) || extractHumanName(author);

  date = extractDateQuick(document, url) || date;

  //extract from ways of writing dates in natural language into standard format
  date = parseDate(date)?.toISOString().split("T")[0] || null;

  if (!date)
    try {
      date = extractDate(
        document,
        true,
        true,
        "%Y-%m-%d",
        url,
        false,
        new Date("2002-01-01")
      );
    } catch (e) {
      console.log(e);
    }

  date = parseDate(date)?.toISOString().split("T")[0] || null;

  title = extractTitle(document) || title;
  source = extractSource(document) || source;

  // URL TO SOURCE
  if (!source && url?.length > 20)
    source = url
      .split("//")[1]
      .split("/")[0]
      ?.replace("www.", "")
      .split(" ")
      .map((word) => word[0].toUpperCase() + word.slice(1))
      .join(" ");

  return { author, author_cite, date, title, source };
}
