// @ts-nocheck
/**
 * @fileoverview Utility to extract core text content from HTML documents.
 * Cleans boilerplate (nav, footer, ads) to produce clean Markdown or text.
 */
import { parseHTML } from "linkedom";
import { extractCite } from "../html-to-cite/extract-cite";
import { convertHTMLToBasicHTML } from "./html-to-basic-html";
import { extractHumanName } from "../html-to-cite/human-names-recognize";
import { extractMainContentFromHTML } from "./extract-content/extract-content-readability";
import { extractMainContentFromHTML2 } from "./extract-content/extract-content-mercury";

/**
 * Extracts the main content and citation information from a document or HTML string
 * @param {string|object} documentOrHTML - The document or HTML string to extract content from
 * @param {Object} options - Optional configuration options
 * @param {boolean} options.images default=true - Whether to include images in the extracted content
 * @param {boolean} options.links default=true - Whether to include links in the extracted content
 * @param {boolean} options.formatting default=true - Whether to preserve formatting in the extracted content
 * @param {string} options.url The URL of the original document, if available, for absolutify-ing URLs
 * @param {boolean} options.useExtractor2 default=false -
 *    false uses Mozilla Readability, true uses Postlight Mercury.
 *    then use the alternate if the first returns less than 200 characters
 * @returns {Object} The extracted content and citation information
 * @property {string} title - The title of the document
 * @property {string} author_cite - The full citation for the author
 * @property {string} author_short - A shortened version of the author's name
 * @property {string} author - The author's name
 * @property {string} date - The publication date
 * @property {string} source - The source of the document
 * @property {string} html - The extracted HTML content
 * @author [vtempest (2025)](https://github.com/vtempest)
 */
export function extractContentAndCite(documentOrHTML, options = {}) {
  const {
    images = true,
    links = true,
    formatting = true,
    url = "",
    useExtractor2 = 1,
    minExtractedLength = 400,
  } = options;

  var html =
    typeof documentOrHTML === "string"
      ? documentOrHTML
      : documentOrHTML?.documentElement?.innerHTML;

  if (!html) return { error: "No HTML found" };

  try {
    var content1 = extractMainContentFromHTML(html, options);
  } catch (e) {
    console.log(e);
  }
  try {
    var content2 = extractMainContentFromHTML2(html, options);
  } catch (e) {
    console.log(e);
  }

  //compare content lengths
  var content = content1?.length > content2?.length ? content1 : content2;

  // check if html is too short, if so use basic html
  if (content?.replace(/<[^>]*>/g, "").length < minExtractedLength)
    content = html;

  //cite
  var { author, author_cite, author_short, date, title, source } = extractCite(
    html,
    options
  );

  html = convertHTMLToBasicHTML(content, options);

  return {
    title,
    author_cite,
    author_short,
    author,
    date,
    source,
    html,
  };
}
/**
 * @typedef {Object} ExtractedContent
 * @property {string} title - The title of the content
 * @property {string} author_cite - The full citation for the author
 * @property {string} author_short - A shortened version of the author's name
 * @property {string} author - The author's name
 * @property {string} date - The publication date
 * @property {string} source - The source of the content
 * @property {string} html - The extracted main content in HTML format
 * @private
 */
