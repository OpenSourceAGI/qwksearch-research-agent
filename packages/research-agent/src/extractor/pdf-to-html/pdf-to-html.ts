/**
 * @fileoverview High-fidelity PDF-to-HTML conversion pipeline.
 * Extracts structural elements (headers, lists, code blocks) and handles page-level metadata.
 */
import grab from "grab-url";

import {
  findPageNumbers,
  findFirstPage,
  removePageNumber,
} from "./utils/page-number-functions";
import TextItem from "./models/text-item";
import Page from "./models/page";

import CalculateGlobalStats from "./transforms/calculate-global-stats";
import CompactLines from "./transforms/line-item/compact-lines";
import RemoveRepetitiveElements from "./transforms/line-item/remove-repetitive-elements";
import VerticalToHorizontal from "./transforms/line-item/vertical-to-horizontal";
import DetectTOC from "./transforms/line-item/detect-toc";
import DetectListItems from "./transforms/line-item/detect-list-items";
import DetectHeaders from "./transforms/line-item/detect-headers";

import GatherBlocks from "./transforms/block/gather-blocks";
import DetectCodeQuoteBlocks from "./transforms/block/detect-code-quote-blocks";
import DetectListLevels from "./transforms/block/detect-list-levels";
import ToTextBlocks from "./transforms/to-text-blocks";
import ToHTML from "./transforms/to-html";
import ParseResult from "./models/parse-result";

/**
 * ### Convert PDF to HTML
 * <img src="https://i.imgur.com/6IdNDLP.png" width="350px" />
 *
 * Extracts formatted text from PDF with parsing of linebreaks ,
 * page headers, footnotes, and section headings. Supports fonts, links, bold,
 * italics, lists, headings, headers, footnotes, and Table of Contents,
 * Quotes, and Code Blocks, . Removes repeated headers, links footnote anchors to the footnote,
 *  and preserves number of the PDF page with invisible I element.
 *
 * This function uses [pdfjs-serverless](https://github.com/johannschopplich/pdfjs-serverless)
 * to work in more environments than PDF.js-based tools:
 * Cloudflare workers, serverless, node.js, and front-end only.
 * @param {string} pdfURLOrBuffer - URL to a PDF file or buffer from fs.readFile
 * @param {Object} [options]
 * @param {boolean} options.addPageNumbers default=false - Adds  #  to end of each page
 * @param {boolean} options.removePageHeaders default=true - Removes repeated headers found on each page
 * @returns {string|Object} HTML formatted text
 * @category Extract
 * @author [vtempest (2025)](https://github.com/vtempest),
 * [pdf-to-markdown (2017)](https://github.com/jzillmann/pdf-to-markdown/tree/master),
 * [pdf.js (2012-)](https://github.com/mozilla/pdf.js/releases),
 */
export async function convertPDFToHTML(
  pdfURLOrBuffer: any,
  options: { addPageNumbers?: boolean; addCitation?: boolean } = {},
) {
  // try {
  var { addPageNumbers = false, addCitation = true } = options;

  // pass in databuffer or download all pdf data
  // and convert to array buffer
  var buffer =
    typeof pdfURLOrBuffer === "string"
      ? await grab(pdfURLOrBuffer, {
          responseType: "arraybuffer",
          timeout: 10,
        })
      : pdfURLOrBuffer;

  let pdfDocument;
  try {
    let resolvePDFJS;
    // try {
    //   // ({ resolvePDFJS } = await import("pdfjs-serverless"));
    // } catch {
      ({ resolvePDFJS } = await import("https://cdn.jsdelivr.net/npm/pdfjs-serverless@1.1.0/+esm" as any));
    // }
    const { getDocument } = await resolvePDFJS();
    pdfDocument = await getDocument({
      data: new Uint8Array(buffer),
      useSystemFonts: true,
      verbosity: 0,
    }).promise;
  } catch (e: any) {
    return { error: e.message };
  }

  const pages = [...Array(pdfDocument.numPages).keys()].map(
    (index) => new Page({ index }),
  );

  let pageIndexNumMap = {};
  let firstPage;
  for (let j = 1; j <= pdfDocument.numPages; j++) {
    const page = await pdfDocument.getPage(j);
    const textContent = await page.getTextContent();

    if (Object.keys(pageIndexNumMap).length < 10) {
      pageIndexNumMap = findPageNumbers(
        pageIndexNumMap,
        page.pageNumber - 1,
        textContent.items,
      );
    } else {
      firstPage = findFirstPage(pageIndexNumMap);
      break;
    }
  }

  let pageNum = firstPage ? firstPage.pageNum : 0;
  for (let j = 1; j <= pdfDocument.numPages; j++) {
    const page = await pdfDocument.getPage(j);

    // Trigger the font retrieval for the page
    await page.getOperatorList();

    const scale = 1.0;
    const viewport = page.getViewport({ scale });
    let textContent = await page.getTextContent();
    if (firstPage && (page as any).pageIndex >= firstPage.pageIndex) {
      textContent = removePageNumber(textContent as any, pageNum) as any;
      pageNum++;
    }
    const textItems = (textContent.items as any[]).map((item: any) => {
      const tx = [1, 0, 0, 1, 0, 0];
      for (let i = 0; i < 6; i++) {
        tx[i] += item.transform[i] * viewport.transform[i % 2 ? 3 : 0];
        if (i % 2) {
          tx[i + 1] += item.transform[i] * viewport.transform[1];
        }
      }

      const fontHeight = Math.sqrt(tx[2] * tx[2] + tx[3] * tx[3]);
      const dividedHeight = item.height / fontHeight;
      return new TextItem({
        x: Math.round(item.transform[4]),
        y: Math.round(item.transform[5]),
        width: Math.round(item.width),
        height: Math.round(dividedHeight <= 1 ? item.height : dividedHeight),
        text: item.str,
        font: item.fontName,
      });
    });
    pages[page.pageNumber - 1].items = textItems;
  }

  var parseResult = new ParseResult({ pages });

  let lastTransformation: (typeof transformations)[number] | undefined,
    transformations = [
      new CalculateGlobalStats(),
      new CompactLines(),
      new RemoveRepetitiveElements(),
      new VerticalToHorizontal(),
      new DetectTOC(),
      new DetectHeaders(),
      new DetectListItems(),

      new GatherBlocks(),
      new DetectCodeQuoteBlocks(),
      new DetectListLevels(),

      new ToTextBlocks(),
      new ToHTML(),
    ];

  transformations?.forEach((transformation) => {
    if (lastTransformation) {
      parseResult = lastTransformation.completeTransform(parseResult);
    }
    parseResult = transformation.transform(parseResult);
    lastTransformation = transformation;
  });

  var html = parseResult.pages.reduce((acc, page, pageNumber) => {
    return (
      acc +
      `<p id="page-${pageNumber + 1}">${
        addPageNumbers ? ` [${pageNumber + 1}] ` : ""
      }${page.items.join('</p><p id="page-' + pageNumber + '">')}</p>`
    );
  }, "");

  if (addCitation) {
    // Get metadata
    // avoid using date as it is unreliable sand generally file mod date
    var metadata = await pdfDocument.getMetadata();
    var { Author: author, Title: title } = metadata.info as any;
    // date =
    //   date.slice(2, 6) + "-" + date.slice(6, 8) + "-" + date.slice(8, 10);
    // date = date ? new Date(date)?.toISOString().split("T")[0] : null;

    //look for date in first page
    // date = chrono
    //   .parseDate(content.slice(0, 400))
    //   ?.toISOString()
    //   .split("T")[0];
    // //  || date;

    title = html.slice(0, 400).match(/<h[0-9]>(.*?)<\/h[0-9]>/)?.[1] || title;
  }

  return { author, title, html, format: "pdf" };
}


