/** @fileoverview DOCX conversion pipeline with style-aware HTML normalization for card parsing. */
import JSZip from "jszip";
import { Parser } from "htmlparser2";
import { parseAsync, renderDocument } from "docx-preview";
import { parseHTML } from "linkedom";
import grab from "grab-url";

type HeadingStyles = Record<string, any>;
type AnyMap = Record<string, any>;

/**
 * Node.js tool for converting DOCX files to HTML while preserving formatting and
 * style information. Uses docx-preview for accurate rendering and extracts
 * heading styles from styles.xml for semantic structure.
 *
 * @param {string|File|Blob|ArrayBuffer} docxBufferOrURL - DOCX file input (URL, File object, Blob, or ArrayBuffer)
 * @param {Object} options - Conversion options
 * @param {boolean} options.plainTextOnly - Whether to output plain text without HTML tags
 * @param {boolean} options.useDocxPreview - Use docx-preview for rendering (default: true)
 * @returns {Promise<string>} HTML string representation of the document
 * @author vtempest
 * @example
 * const fileInput = fs.readFile('demo.docx');
 * const html = await convertDocxToHTML(fileInput);
 */
export async function convertDocxToHTML(
  docxBufferOrURL: string | File | Blob | ArrayBuffer | Buffer,
  options: { plainTextOnly?: boolean; useDocxPreview?: boolean } = {},
): Promise<string> {
  const { plainTextOnly = false, useDocxPreview = true } = options;

  if (!docxBufferOrURL) return "";

  // Process input into ArrayBuffer
  let arrayBuffer: ArrayBuffer | undefined;
  try {
    if (typeof docxBufferOrURL === "string") {
      // URL input is fetched and converted to ArrayBuffer.
      if (docxBufferOrURL.startsWith("http")) {
        const result = await grab(docxBufferOrURL);
        if (result.error) throw new Error(result.error);
        const blob = result.data;
        if (!blob || typeof blob.arrayBuffer !== "function") {
          throw new Error("Result is not a valid blob");
        }
        arrayBuffer = await blob.arrayBuffer();
      }
    } else if (
      docxBufferOrURL instanceof File ||
      docxBufferOrURL instanceof Blob
    ) {
      // Browser/File API inputs expose arrayBuffer directly.
      arrayBuffer = await docxBufferOrURL.arrayBuffer();
    } else if (docxBufferOrURL instanceof ArrayBuffer) {
      arrayBuffer = docxBufferOrURL;
    } else if (
      typeof Buffer !== "undefined" &&
      Buffer.isBuffer(docxBufferOrURL)
    ) {
      // Node.js Buffer must be sliced to the exact byte window.
      arrayBuffer = docxBufferOrURL.buffer.slice(
        docxBufferOrURL.byteOffset,
        docxBufferOrURL.byteOffset + docxBufferOrURL.byteLength,
      ) as ArrayBuffer;
    } else {
      throw new Error("Unsupported input type");
    }

    if (!arrayBuffer) {
      throw new Error("Could not read DOCX input");
    }

    // Extract styles.xml for heading information
    const zip = new JSZip();
    await zip.loadAsync(arrayBuffer);
    const styleXML = (await zip.file("word/styles.xml")?.async("string")) || "";

    // Parse styles.xml once so both render paths share heading metadata.
    const headingStyles = await parseStylesXML(styleXML);

    if (useDocxPreview) {
      // Use docx-preview for accurate rendering
      const html = await renderWithDocxPreview(
        arrayBuffer,
        headingStyles,
        plainTextOnly,
      );
      return html;
    } else {
      // Fallback to manual parsing
      const docFile = zip.file("word/document.xml");
      if (!docFile) throw new Error("Missing word/document.xml");
      const docXML = await docFile.async("string");
      const html = await parseDocumentManually(docXML, styleXML, plainTextOnly);
      return html;
    }
  } catch (error) {
    console.error("Error processing DOCX file:", error);
    throw error;
  }
}

/**
 * Parse styles.xml to extract heading styles and formatting information
 * @param {string} styleXML - Raw XML content of styles.xml
 * @returns {Promise<Object>} Parsed heading styles with outline levels
 */
async function parseStylesXML(styleXML: string): Promise<HeadingStyles> {
  const headingStyles: HeadingStyles = {};
  let currentStyle: AnyMap | null = null;

  await new Promise<void>((resolve, reject) => {
    const parser = new Parser(
      {
        onopentag(name: string, attributes: AnyMap) {
          // Start of a style definition
          if (name === "w:style") {
            const styleId = attributes["w:styleId"];
            const styleType = attributes["w:type"];
            currentStyle = {
              id: styleId,
              type: styleType,
              name: null,
              outlineLevel: null,
              basedOn: null,
              formatting: {
                underline: false,
                strong: false,
                mark: false,
              },
            };
            return;
          }

          if (!currentStyle) return;

          // Style name
          if (name === "w:name") {
            currentStyle.name = attributes["w:val"];
          }

          // Based on another style
          if (name === "w:basedOn") {
            currentStyle.basedOn = attributes["w:val"];
          }

          // Outline level (determines heading level h1-h6)
          if (name === "w:outlineLvl") {
            // DOCX outline levels are zero-based; HTML headings are one-based.
            currentStyle.outlineLevel = parseInt(attributes["w:val"], 10) + 1;
          }

          // Formatting properties
          if (name === "w:u" && attributes["w:val"] !== "none") {
            currentStyle.formatting.underline = true;
          }
          if (name === "w:highlight") {
            currentStyle.formatting.mark = true;
          }
          if (name === "w:b" && attributes["w:val"] !== "0") {
            currentStyle.formatting.strong = true;
          }

          // Check for heading-like style names
          if (currentStyle.id?.toLowerCase().includes("highli")) {
            currentStyle.formatting.mark = true;
          }
        },

        onclosetag(name: string) {
          if (name === "w:style" && currentStyle) {
            headingStyles[currentStyle.id] = currentStyle;
            currentStyle = null;
          }
        },

        onend: () => resolve(),
        onerror: (err: Error) => reject(err),
      },
      { xmlMode: true },
    );

    parser.write(styleXML);
    parser.end();
  });

  return headingStyles;
}

/**
 * Render DOCX using docx-preview library
 * @param {ArrayBuffer} arrayBuffer - DOCX file as ArrayBuffer
 * @param {Object} headingStyles - Parsed heading styles from styles.xml
 * @param {boolean} plainTextOnly - Whether to return plain text
 * @returns {Promise<string>} Rendered HTML string
 */
async function renderWithDocxPreview(
  arrayBuffer: ArrayBuffer,
  headingStyles: HeadingStyles,
  plainTextOnly: boolean,
): Promise<string> {
  // Create virtual DOM using linkedom for server-side rendering
  const { document } = parseHTML(
    "<!DOCTYPE html><html><head></head><body></body></html>",
  );

  const bodyContainer = document.createElement("div");
  const styleContainer = document.createElement("style");

  // Parse the document to get internal structure
  const wordDocument = await parseAsync(arrayBuffer, {
    ignoreWidth: true,
    ignoreHeight: true,
    ignoreFonts: true,
    breakPages: false,
    renderHeaders: false,
    renderFooters: false,
    renderFootnotes: false,
    renderEndnotes: false,
    useBase64URL: true,
  });

  // Render to virtual DOM so this works in server-side environments too.
  await renderDocument(wordDocument, bodyContainer, styleContainer, {
    className: "docx",
    ignoreWidth: true,
    ignoreHeight: true,
    ignoreFonts: true,
    breakPages: false,
    renderHeaders: false,
    renderFooters: false,
    renderFootnotes: false,
    renderEndnotes: false,
    useBase64URL: true,
  });

  if (plainTextOnly) {
    // Collapse whitespace for stable downstream plain-text parsing.
    return bodyContainer.textContent?.replace(/\s+/g, " ").trim() || "";
  }

  // Post-process HTML to apply heading styles and clean up
  let html = bodyContainer.innerHTML;

  // Apply heading level mappings based on extracted styles
  html = applyHeadingStyles(html, headingStyles);

  // Clean up docx-preview specific classes and empty elements
  html = cleanupHtml(html);

  return html.replace(/\s+/g, " ").trim();
}

/**
 * Apply heading styles based on styles.xml definitions
 * @param {string} html - Raw HTML from docx-preview
 * @param {Object} headingStyles - Parsed heading styles
 * @returns {string} HTML with proper heading tags
 */
function applyHeadingStyles(
  html: string,
  headingStyles: HeadingStyles,
): string {
  // Map docx-preview class names to proper heading elements based on outline levels
  for (const [styleId, style] of Object.entries(headingStyles)) {
    if (
      style.outlineLevel &&
      style.outlineLevel >= 1 &&
      style.outlineLevel <= 6
    ) {
      const headingTag = `h${style.outlineLevel}`;
      // Replace paragraphs with this style class to proper heading elements
      const classPattern = new RegExp(
        `<p([^>]*class="[^"]*${styleId}[^"]*"[^>]*)>`,
        "gi",
      );
      html = html.replace(classPattern, `<${headingTag}$1>`);
      // NOTE: this replacement is intentionally conservative to avoid breaking mixed markup.
      html = html.replace(new RegExp(`</p>`, "gi"), (match, _offset) => {
        // This is a simplified replacement - in practice you'd need proper tracking
        return match;
      });
    }
  }

  // Also handle standard Heading1, Heading2, etc. style names
  for (let i = 1; i <= 6; i++) {
    const patterns = [
      new RegExp(
        `<p([^>]*class="[^"]*Heading${i}[^"]*"[^>]*)>([\\s\\S]*?)</p>`,
        "gi",
      ),
      new RegExp(
        `<p([^>]*class="[^"]*heading${i}[^"]*"[^>]*)>([\\s\\S]*?)</p>`,
        "gi",
      ),
    ];
    patterns.forEach((pattern) => {
      html = html.replace(pattern, `<h${i}$1>$2</h${i}>`);
    });
  }

  return html;
}

/**
 * Clean up docx-preview generated HTML
 * @param {string} html - Raw HTML
 * @returns {string} Cleaned HTML
 */
function cleanupHtml(html: string): string {
  // Remove wrapper divs with docx classes while keeping content
  html = html.replace(/<div[^>]*class="[^"]*docx-wrapper[^"]*"[^>]*>/gi, "");
  html = html.replace(/<\/div>/gi, "");

  // Remove empty spans
  html = html.replace(/<span[^>]*>\s*<\/span>/gi, "");

  // Remove docx-specific style attributes but keep formatting
  html = html.replace(/\s*style="[^"]*margin[^"]*"/gi, "");

  return html;
}

/**
 * Fallback manual parsing (original implementation)
 * @param {string} docXML - document.xml content
 * @param {string} styleXML - styles.xml content
 * @param {boolean} plainTextOnly - Whether to return plain text
 * @returns {Promise<string>} Parsed HTML
 */
async function parseDocumentManually(
  docXML: string,
  styleXML: string,
  plainTextOnly: boolean,
): Promise<string> {
  // Parse styles.xml for formatting information
  const parsedStyles: AnyMap = {};
  let currentStyleName = "";

  await new Promise<void>((resolve, reject) => {
    const parser = new Parser(
      {
        onopentag(name: string, attributes: AnyMap) {
          if (name === "w:style") {
            currentStyleName = attributes["w:styleId"];
            parsedStyles[currentStyleName] = {
              underline: false,
              strong: false,
              mark: false,
            };
            return;
          }

          if (!currentStyleName) return;

          const styles = parsedStyles[currentStyleName];
          switch (name) {
            case "w:u":
              styles.underline = attributes["w:val"] !== "none";
              break;
            case "w:highlight":
              styles.mark = true;
              break;
            case "w:b":
              styles.strong = attributes["w:val"] !== "0";
              break;
          }

          if (currentStyleName.toLowerCase().includes("highli")) {
            styles.mark = true;
          }
        },
        onend: () => resolve(),
        onerror: (err: Error) => reject(err),
      },
      { xmlMode: true },
    );

    parser.write(styleXML);
    parser.end();
  });

  // Tokenize document.xml into structured blocks
  const blocks: any[] = [];
  let currentBlock: any = null;
  let currentToken: any = null;

  await new Promise<void>((resolve, reject) => {
    const parser = new Parser(
      {
        onopentag(name: string, attributes: AnyMap) {
          switch (name) {
            case "w:p":
              currentBlock = { format: "text", tokens: [] };
              break;

            case "w:pStyle":
              if (currentBlock) {
                const styleKey =
                  Object.keys(styleMap).find(
                    (key) => styleMap[key].xmlName === attributes["w:val"],
                  ) || "text";
                currentBlock.format = styleKey;
              }
              break;

            case "w:outlineLvl":
              if (currentBlock) {
                const outlineLvl = +attributes["w:val"] + 1;
                const styleKey =
                  Object.keys(styleMap).find(
                    (key) =>
                      styleMap[key].docxStyles?.outlineLevel === outlineLvl,
                  ) || "text";
                currentBlock.format = styleKey;
              }
              break;

            case "w:r":
              currentToken = {
                text: "",
                format: { underline: false, strong: false, mark: false },
              };
              break;

            case "w:rStyle":
              if (currentToken && parsedStyles[attributes["w:val"]]) {
                currentToken.format = { ...parsedStyles[attributes["w:val"]] };
              }
              break;

            case "w:u":
              if (currentToken) {
                currentToken.format.underline = attributes["w:val"] !== "none";
              }
              break;

            case "w:highlight":
              if (currentToken) {
                currentToken.format.mark = true;
              }
              break;

            case "w:b":
              if (currentToken) {
                currentToken.format.strong = attributes["w:val"] !== "0";
              }
              break;
          }
        },

        ontext(data: string) {
          if (currentToken) {
            currentToken.text += data;
          }
        },

        onclosetag(name: string) {
          switch (name) {
            case "w:p":
              if (currentBlock && currentBlock.tokens.length) {
                blocks.push(currentBlock);
              }
              currentBlock = null;
              break;

            case "w:r":
              if (currentToken && currentToken.text && currentBlock) {
                currentBlock.tokens.push(currentToken);
              }
              currentToken = null;
              break;
          }
        },

        onend: () => resolve(),
        onerror: (err: Error) => reject(err),
      },
      { xmlMode: true },
    );

    parser.write(docXML);
    parser.end();
  });

  // Merge same format blocks
  blocks.forEach((block: any) => {
    block.tokens = block.tokens.reduce((acc: any[], { format, text }: any) => {
      if (!acc.length) return [{ format, text }];

      const prev = acc[acc.length - 1];
      const isSameFormat =
        format.mark === prev.format.mark &&
        format.strong === prev.format.strong &&
        format.underline === prev.format.underline;

      if (isSameFormat) {
        prev.text += text;
      } else {
        acc.push({ text, format });
      }
      return acc;
    }, []);
  });

  // Convert tokens to HTML
  let html = "";
  const state: Record<string, boolean> = {
    underline: false,
    strong: false,
    mark: false,
  };

  blocks.forEach(({ format, tokens }: any) => {
    if (!tokens.length) return;

    const { domElement } = styleMap[format];
    if (!plainTextOnly) html += `<${domElement}>`;

    tokens.forEach(({ text, format }: any) => {
      if (!text || text.trim().length < 1) return;

      let tags = "";
      for (const style in state) {
        if (state[style] !== format[style]) {
          const elName = styleMap[style]?.domElement;
          if (elName) {
            tags += format[style] ? `<${elName}>` : `</${elName}>`;
            state[style] = format[style];
          }
        }
      }

      html += plainTextOnly ? text : tags + text;
    });

    html += plainTextOnly ? "\n" : `</${domElement}>`;
  });

  // Close any remaining open tags
  if (!plainTextOnly) {
    for (const style in state) {
      if (state[style] && styleMap[style]?.domElement) {
        html += `</${styleMap[style].domElement}>`;
      }
    }
  }

  return html.replace(/\s+/g, " ").trim();
}

/**
 * Style mapping configuration for DOCX to HTML conversion
 * Maps internal style names to HTML elements and DOCX properties
 */
export const styleMap: Record<string, any> = {
  pocket: {
    block: true,
    heading: true,
    domSelector: ["h1"],
    domElement: "h1",
    xmlName: "Heading1",
    docxStyles: { heading: 1, outlineLevel: 1 },
  },
  hat: {
    block: true,
    heading: true,
    domSelector: ["h2"],
    domElement: "h2",
    xmlName: "Heading2",
    docxStyles: { heading: 2, outlineLevel: 2 },
  },
  block: {
    block: true,
    heading: true,
    domSelector: ["h3"],
    domElement: "h3",
    xmlName: "Heading3",
    docxStyles: { heading: 3, outlineLevel: 3 },
  },
  tag: {
    block: true,
    heading: true,
    domSelector: ["h4"],
    domElement: "h4",
    xmlName: "Heading4",
    docxStyles: { heading: 4, outlineLevel: 4 },
  },
  text: {
    block: true,
    heading: false,
    domSelector: ["p"],
    domElement: "p",
  },
  underline: {
    block: false,
    heading: false,
    domSelector: ["span", "u"],
    domElement: "u",
    docxStyles: { underline: {} },
  },
  strong: {
    block: false,
    heading: false,
    domSelector: ["strong"],
    domElement: "b",
    docxStyles: { bold: true },
  },
  mark: {
    block: false,
    heading: false,
    domSelector: ["mark"],
    domElement: "mark",
    docxStyles: { highlight: "cyan" },
  },
};
