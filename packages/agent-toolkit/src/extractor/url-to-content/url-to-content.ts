/**
 * @fileoverview High-level orchestrator for extracting content from any URL or binary buffer.
 * Supports YouTube transcripts, PDFs, DOCX, and web articles.
 */
import grab from "grab-url";
import { extractContentAndCite } from "../html-to-content/html-to-content";
import { getURLYoutubeVideo, convertYoutubeToText } from "./youtube-helpers";
import { convertPDFToHTML } from "extract-pdf";
import { convertDOCXToHTML, isBufferDOCX } from "./docx-to-content";
import { scrapeURL } from "./url-to-html";

async function isUrlPDF(url: string) {
  try {
    const buffer = await grab(url, { responseType: "arraybuffer", timeout: 10 });
    if (!buffer || buffer.byteLength < 5) return false;
    const chunk = new Uint8Array(buffer);
    return chunk[0] === 0x25 && chunk[1] === 0x50 && chunk[2] === 0x44 && chunk[3] === 0x46 && chunk[4] === 0x2d;
  } catch {
    return false;
  }
}

export interface ExtractContentOptions {
  images?: boolean;
  links?: boolean;
  formatting?: boolean;
  absoluteURLs?: boolean;
  timeout?: number;
  proxy?: string | null;
  citeFormatMonthFull?: boolean;
  citeFormatAuthorFull?: boolean;
  url?: string;
  useThirdPartyBackup?: boolean;
  /** Preferred transcript languages when extracting YouTube videos. */
  languages?: string[];
}

export interface ExtractedArticle {
  cite?: string;
  html?: string;
  url?: string;
  author?: string;
  author_cite?: string;
  author_short?: string;
  author_type?: number | string;
  date?: string;
  title?: string;
  source?: string;
  word_count?: number;
  format?: string;
  error?: string | number;
}

type UrlLikeDocument = {
  location?: { href?: string };
  querySelectorAll?: (
    selector: string,
  ) => { length: number } | ArrayLike<unknown>;
};

/**
 * @typedef {Object} Article
 * @property {string} cite - Cite in APA Format with Author name in Last, First Initial format
 * @property {string} html - The Basic HTML content of the article
 * @property {string} url - The URL of the article
 * @property {string} author - The full name of the author of the article
 * @property {string} author_cite - Author name in Last, First Initial format
 * @property {string} author_short - Author name in Last format
 * @property {number} author_type - Author type ["single", "two-author", "more-than-two", "organization"]
 * @property {string} date - The publication date of the article
 * @property {string} title - The title of the article
 * @property {string} source - The source or publisher of the article
 * @property {number} word_count - The word count of the full text (without HTML tags)
 * @category Extract
 */

/**
 * ### 🚜 Tractor the Text Extractor
 * <img width="350px"  src="https://i.imgur.com/o8NTXxY.png" />
 *
 * 1. Main Content Detection: Extract the main content from a URL by combining
 * Mozilla Readability and Postlight Mercury algorithms, utilizing over 100
 * custom adapters for major sites for article, author, date HTML classes.
 * 2. Basic HTML Standardization: Transform complex HTML into a simplified
 * reading-mode format of basic HTML, making it ideal for research note archival
 *  and focused reading, with headings, images and links.
 * 3. YouTube Transcript Processing: When a YouTube video URL is detected,
 * retrieve the complete video transcript including both manual captions and
 * auto-generated subtitles, maintaining proper timestamp synchronization and
 * speaker identification where available.
 * 4. PDF to HTML: Process PDF documents by extracting
 *  formatted text while intelligently handling line breaks, page headers,
 *  footnotes. The system analyzes text height statistics to automatically
 *  infer heading levels, creating a properly structured document hierarchy
 *  based on standard deviation from mean text size.
 * 5. DOCX Binary Buffer Processing: Accept DOCX files as binary buffers
 * (ArrayBuffer, Buffer, or Uint8Array) and automatically detect and convert
 * them to HTML while preserving formatting, styles, and document structure.
 * 6. Citation Information Extraction: Identify and extract citation metadata
 *  including author names, publication dates, sources, and titles using HTML
 *  meta tags and common class name patterns. The system validates author names
 *  against a comprehensive database of 90,000 first and last names,
 * distinguishing between personal and organizational authors to properly
 * format citations.
 * 7. Author Name Formatting: Process author names by checking against
 * known name databases, handling affixes and titles correctly, and determining
 *  whether to reverse the name order based on whether it's a personal or
 * organizational author, ensuring proper citation formatting.
 * @param {document|string|ArrayBuffer|Buffer|Uint8Array} urlOrDoc - url, dom object with article content, or binary buffer (DOCX)
 * @param {Object} [options]
 * @param {boolean} options.images default=true - include images
 * @param {boolean} options.links default=true - include links
 * @param {boolean} options.formatting default=true - preserve formatting
 * @param {boolean} options.absoluteURLs default=true - convert URLs to absolute
 * @param {number} options.timeout default=5 - http request timeout
 * @returns {{
 *  title: string,
 *  author_cite: string,
 *  cite: string,
 *  author: string,
 *  date: string,
 *  source: string,
 *  html: string,
 *  word_count: number
 * }}
 * cite - Cite in APA Format with Author name in Last, First Initial format
 * url - The URL of the article
 *  html - The HTML content of the article
 *  author - The author of the article
 *  author_cite - Author name in Last, First Middle format
 *  author_short - Author name in Last format
 *  author_type - Author type ["single", "two-author", "more-than-two", "organization"]
 *  date - The publication date of the article
 *  title - The title of the article
 *  source - The source or origin of the article
 *  word_count - The word count of the full text (without HTML tags)
 * @category Extract
 * @author [vtempest (2025)](https://github.com/vtempest)
 * @example
 * // Extract from URL
 * const result1 = await extractContent('https://example.com/article');
 *
 * // Extract from DOCX binary buffer
 * const docxBuffer = new Uint8Array([...]); // DOCX file bytes
 * const result2 = await extractContent(docxBuffer);
 *
 * // Extract from DOM object
 * const result3 = await extractContent(document);
 */
export async function extractContent(
  urlOrDoc:
    | string
    | Document
    | UrlLikeDocument
    | ArrayBuffer
    | Buffer
    | Uint8Array,
  options: ExtractContentOptions = {},
): Promise<ExtractedArticle> {
  var {
    images = true,
    links = true,
    formatting = true,
    absoluteURLs = true,
    timeout = 10,
    proxy = null,
    citeFormatMonthFull = false,
    citeFormatAuthorFull = true,
  } = options;
  let response: ExtractedArticle = {};

  let url, isPdf, isDocxBuffer;

  // Check if input is a binary buffer (DOCX)
  if (
    urlOrDoc instanceof ArrayBuffer ||
    urlOrDoc instanceof Uint8Array ||
    (typeof Buffer !== "undefined" && Buffer.isBuffer(urlOrDoc))
  ) {
    isDocxBuffer = isBufferDOCX(urlOrDoc);

    if (isDocxBuffer) {
      // Handle DOCX binary buffer
      response.html = await convertDOCXToHTML(urlOrDoc, options);
      url = "buffer://docx"; // Placeholder URL for buffer input
    } else {
      return { error: "Binary buffer is not a valid DOCX file" };
    }
  } else if (
    typeof urlOrDoc === "string" &&
    /<\/[^>]+>/.test(urlOrDoc.trim())
  ) {
    console.log("[extractContent] input is raw HTML string");
    // If urlOrDoc is an HTML string, treat as HTML content
    options.url = options.url || "";

    response = extractContentAndCite(urlOrDoc, options);
    console.log("[extractContent] extractContentAndCite (raw html) result", {
      hasHtml: !!response?.html,
      htmlLength: response?.html?.length || 0,
      title: response?.title,
      error: response?.error,
    });

    return response;
    // if URL
  } else if (typeof urlOrDoc === "string" && urlOrDoc.startsWith("http")) {
    url = urlOrDoc;
    console.log("[extractContent] input is URL", { url });

    // check if google doc, then extract html or pdf file
    let googleDocId = url.match(/google\.com\/(file|document)\/d\/([\w-]+)/);
    if (googleDocId) {
      url =
        googleDocId[1] === "file"
          ? `https://drive.google.com/uc?export=download&id=${googleDocId[2]}`
          : `https://docs.google.com/document/d/${googleDocId[2]}/export?format=html`;
      console.log("[extractContent] rewrote google doc url", { url });
    }

    isPdf = url.endsWith(".pdf") || (await isUrlPDF(url));
    let youtubeID = getURLYoutubeVideo(url);
    console.log("[extractContent] branch detection", {
      isPdf,
      youtubeID,
      isDocx: url.endsWith(".docx"),
    });

    if (isPdf) {
      // pdf checker - use dynamic import to prevent build-time evaluation
      response = await convertPDFToHTML(url, options as any);
      console.log("[extractContent] pdf branch result", {
        hasHtml: !!response?.html,
        error: response?.error,
      });
    } else if (url.endsWith(".docx")) {
      response.html = await convertDOCXToHTML(url);
      console.log("[extractContent] docx branch result", {
        hasHtml: !!response?.html,
      });

      // check youtube
    } else if (youtubeID) {
      response = await convertYoutubeToText(url, options);
      console.log("[extractContent] youtube branch result", {
        hasHtml: !!response?.html,
        error: response?.error,
      });
    } else {
      console.log("[extractContent] scraping URL", { url, proxy });

      try {
        const html = await scrapeURL(url, {
          proxy,
        });
        console.log("[extractContent] scrapeURL returned", {
          url,
          hasHtml: !!html,
          htmlLength: typeof html === "string" ? html.length : 0,
          sample: typeof html === "string" ? html.slice(0, 200) : null,
        });

        // Check if scrapeURL returned an error object instead of HTML string
        if (typeof html !== "string" || !html) {
          console.error("[extractContent] scrapeURL failed or returned non-string", {
            url,
            typeofHtml: typeof html,
            isEmpty: !html,
          });
          return {
            error: "Failed to fetch HTML content",
          };
        }

        options.url = url;
        response = extractContentAndCite(html, options);
        console.log("[extractContent] extractContentAndCite result", {
          url,
          hasHtml: !!response?.html,
          htmlLength: response?.html?.length || 0,
          title: response?.title,
          error: response?.error,
        });
      } catch (scrapeError) {
        const err = scrapeError as Error;
        console.error("[extractContent] scrapeURL threw error", {
          url,
          message: err?.message,
        });
        return {
          error: `Failed to scrape URL: ${err?.message || String(scrapeError)}`,
        };
      }
    }
  } else if (typeof urlOrDoc == "object" && urlOrDoc.location) {
    //if passing in dom object document from front end

    url = urlOrDoc.location.href;

    //pdf checker for embedded docs
    if (urlOrDoc?.querySelectorAll)
      isPdf = urlOrDoc?.querySelectorAll(
        'embed[type="application/pdf"]',
      )?.length;
    var youtubeID = getURLYoutubeVideo(url);

    if (isPdf) {
      response = await convertPDFToHTML(url, {});
    } else if (youtubeID) {
      // from front end

      //if on same domain page in chrome-extension
      options.useThirdPartyBackup = false;
      response = await convertYoutubeToText(url, options);
    } //pass doc to extract
    else response = extractContentAndCite(urlOrDoc as Document, options);
  } else {
    // Handle other object types or invalid input
    return {
      error:
        "Invalid input type. Expected URL string, DOM object, or DOCX binary buffer.",
    };
  }

  //if no text
  if (response.error || !response.html) return { error: response.error };

  //word count of full text original, no html
  response.word_count = response.html
    ?.replace(/<[^>]*>/g, " ")
    .split(" ").length;

  //make APA cite

  var { author, author_cite, author_short, date, title, source } = response;

  var apa_cite_date =
    new Date(date).getFullYear() > 1971
      ? " (" +
        new Date(date).getFullYear() +
        ", " +
        new Date(date).toLocaleDateString("en-US", {
          month: citeFormatMonthFull ? "long" : "short",
          day: "numeric",
        }) +
        ")"
      : ""; //"(N.D.)";

  var cite = `${author_cite || source || " "}${apa_cite_date}. <b>${
    title || ""
  }</b>. <i>${source || ""}</i>. <a href="${url}" target="_blank">${url}</a>`;

  //shorten long urls by removing ?params=get used as state tracking
  if (url && url.includes("?") && url.length > 150)
    response.url = url.split("?")[0];

  //put url on top
  response = Object.assign({ url, cite }, response);
  return response;
}
