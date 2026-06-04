// @ts-nocheck
/**
 * @module research/extractor/url-to-content/docx-to-content
 * @description Research library module.
 */
import JSZip from "jszip";
import grab from "grab-url";

/**
 * Configuration options for DOCX parsing
 * @typedef {Object} DocxOptions
 * @property {boolean} [preserveShapes=true] - Whether to preserve shape elements
 * @property {boolean} [includeStyles=true] - Whether to include document styles
 * @property {string} [imgPath=''] - Base path for image resources
 */

/**
 * Style configuration for elements
 * @typedef {Object} StyleConfig
 * @property {boolean} block - If true, element is rendered as block
 * @property {boolean} [heading] - If true, element is a heading
 * @property {string} element - HTML element name
 * @property {string} [xmlName] - DOCX XML element name
 * @property {string} [class] - CSS class name
 */

const STYLE_MAP = {
  paragraph: { block: true, element: "p" },
  section: { block: true, element: "section" },
  header: { block: true, element: "header" },
  footer: { block: true, element: "footer" },
  table: { block: true, element: "table" },
  textbox: { block: true, element: "div", class: "textbox" },
  h1: { block: true, heading: true, element: "h1", xmlName: "Heading1" },
  h2: { block: true, heading: true, element: "h2", xmlName: "Heading2" },
  text: { element: "span" },
  del: { element: "del" },
  strong: { element: "strong" },
};

const TABLE_STYLES = {
  firstRow: "table-first-row",
  lastRow: "table-last-row",
  oddRow: "table-odd-row",
  evenRow: "table-even-row",
};

/**
 * Converts a DOCX document to HTML
 *
 * @param {string|File|Blob|ArrayBuffer|Buffer|Uint8Array} input - DOCX input to convert
 * @param {DocxOptions} [options] - Conversion options
 * @returns {Promise<string>} The converted HTML
 * @throws {Error} If conversion fails
 * @category Extract
 * @example
 * const html = await convertDOCXToHTML('https://example.com/doc.docx');
 * const html = await convertDOCXToHTML(fileInput.files[0]);
 */
export async function convertDOCXToHTML(input, options = {}) {
  // Default options
  const settings = {
    preserveShapes: true,
    includeStyles: true,
    imgPath: "",
    ...options,
  };

  /**
   * Converts input to ArrayBuffer
   * @param {string|File|Blob|ArrayBuffer|Buffer|Uint8Array} input
   * @returns {Promise<ArrayBuffer>}
   */
  async function getBuffer(input) {
    if (input instanceof ArrayBuffer) {
      return input;
    }
    if (input instanceof Uint8Array) {
      return input.buffer.slice(
        input.byteOffset,
        input.byteOffset + input.byteLength,
      );
    }
    if (typeof Buffer !== "undefined" && Buffer.isBuffer(input)) {
      return input.buffer.slice(
        input.byteOffset,
        input.byteOffset + input.byteLength,
      );
    }
    if (input instanceof Blob || input instanceof File) {
      return await input.arrayBuffer();
    }
    if (typeof input === "string") {
      return await grab(input, { responseType: "arraybuffer" });
    }
    throw new Error("Invalid input type");
  }

  /**
   * Extracts XML content from zip
   * @param {JSZip} zip
   * @param {string} path
   * @returns {Promise<string>}
   */
  async function extractXml(zip, path) {
    const file = zip.file(path);
    return file ? await file.async("string") : "";
  }

  /**
   * Parses document styles
   * @param {string} xml
   * @returns {Object}
   */
  function parseStyles(xml) {
    if (!xml) return {};

    const styles = {
      document: {},
      paragraph: {},
      character: {},
      table: {},
    };

    // Parse default styles
    const defaultMatch = /<w:docDefaults>[\s\S]*?<\/w:docDefaults>/i.exec(xml);
    if (defaultMatch) {
      const defaults = defaultMatch[0];
      // Parse font, size, etc.
      styles.document = {
        fontFamily: /<w:rFonts[^>]*w:ascii="([^"]+)"/.exec(defaults)?.[1],
        fontSize: /<w:sz[^>]*w:val="([^"]+)"/.exec(defaults)?.[1],
        color: /<w:color[^>]*w:val="([^"]+)"/.exec(defaults)?.[1],
      };
    }

    // Parse named styles
    const styleRegex =
      /<w:style\s+w:type="(\w+)"\s+w:styleId="([^"]+)"[^>]*>([\s\S]*?)<\/w:style>/gi;
    let match;
    while ((match = styleRegex.exec(xml)) !== null) {
      const [_, type, id, content] = match;
      if (styles[type.toLowerCase()]) {
        styles[type.toLowerCase()][id] = parseStyleProperties(content);
      }
    }

    return styles;
  }

  /**
   * Parses style properties from XML content
   * @param {string} content
   * @returns {Object}
   */
  function parseStyleProperties(content) {
    return {
      bold: /<w:b\/>/.test(content),
      italic: /<w:i\/>/.test(content),
      underline: /<w:u\/>/.test(content),
      fontSize: /<w:sz[^>]*w:val="([^"]+)"/.exec(content)?.[1],
      color: /<w:color[^>]*w:val="([^"]+)"/.exec(content)?.[1],
      alignment: /<w:jc[^>]*w:val="([^"]+)"/.exec(content)?.[1],
    };
  }

  /**
   * Parses document content
   * @param {string} xml
   * @param {Object} context
   * @returns {Array}
   */
  function parseDocument(xml, context) {
    const blocks = [];

    // Parse sections
    const sections = xml.split(/<w:sectPr[^>]*>[\s\S]*?<\/w:sectPr>/gi);

    sections.forEach((section, index) => {
      if (!section.trim()) return;

      const content = [];

      // Parse paragraphs
      const pRegex = /<w:p\b[^>]*>[\s\S]*?<\/w:p>/gi;
      let pMatch;
      while ((pMatch = pRegex.exec(section)) !== null) {
        const para = parseParagraph(pMatch[0], context);
        if (para) content.push(para);
      }

      // Parse tables
      const tblRegex = /<w:tbl\b[^>]*>[\s\S]*?<\/w:tbl>/gi;
      let tblMatch;
      // while ((tblMatch = tblRegex.exec(section)) !== null) {
      //   // const table = parseTable(tblMatch[0], context);
      //   if (table) content.push(table);
      // }

      blocks.push({
        type: "section",
        content,
      });
    });

    return blocks;
  }

  try {
    const buffer = await getBuffer(input);
    const zip = new JSZip();
    const docx = await zip.loadAsync(buffer);

    // Extract core XML files
    const [docXml, stylesXml, numberingXml, relsXml] = await Promise.all([
      extractXml(docx, "word/document.xml"),
      extractXml(docx, "word/styles.xml"),
      extractXml(docx, "word/numbering.xml"),
      extractXml(docx, "word/_rels/document.xml.rels"),
    ]);

    // Parse document structure
    const styles = settings.includeStyles ? parseStyles(stylesXml) : {};
    const content = parseDocument(docXml, { styles });

    // Generate final HTML
    return generateHtml(content, styles);
  } catch (error) {
    console.error("Error converting DOCX:", error);
    throw error;
  }
}

/**
 * @typedef {Object} ParagraphStyle
 * @property {string} [alignment] - Text alignment (left, right, center, justify)
 * @property {string} [spacing] - Line spacing
 * @property {string} [indentation] - Paragraph indentation
 * @property {boolean} [keepNext] - Keep with next paragraph
 * @property {boolean} [pageBreakBefore] - Force page break before
 */

/**
 * @typedef {Object} RunStyle
 * @property {boolean} [bold] - Bold text
 * @property {boolean} [italic] - Italic text
 * @property {boolean} [underline] - Underlined text
 * @property {string} [color] - Text color
 * @property {string} [highlight] - Highlight color
 * @property {string} [size] - Font size
 * @property {string} [font] - Font family
 */

/**
 * Parses a DOCX paragraph element into a structured object
 * @param {string} xml - Paragraph XML string
 * @param {Object} context - Document context containing styles and relationships
 * @returns {Object|null} Parsed paragraph object or null if invalid
 */
function parseParagraph(xml, context) {
  if (!xml || !xml.trim()) return null;

  /**
   * Extracts paragraph style properties
   * @param {string} pPr - Style properties XML
   * @returns {ParagraphStyle}
   */
  function getParagraphStyle(pPr) {
    if (!pPr) return {};

    return {
      alignment: /<w:jc\s+w:val="([^"]+)"/.exec(pPr)?.[1],
      spacing: /<w:spacing\s+w:line="([^"]+)"/.exec(pPr)?.[1],
      indentation: /<w:ind\s+w:left="([^"]+)"/.exec(pPr)?.[1],
      keepNext: /<w:keepNext\s*\/>/.test(pPr),
      pageBreakBefore: /<w:pageBreakBefore\s*\/>/.test(pPr),
      styleId: /<w:pStyle\s+w:val="([^"]+)"/.exec(pPr)?.[1],
    };
  }

  /**
   * Extracts run (text span) style properties
   * @param {string} rPr - Run properties XML
   * @returns {RunStyle}
   */
  function getRunStyle(rPr) {
    if (!rPr) return {};

    return {
      bold: /<w:b\s*\/>/.test(rPr),
      italic: /<w:i\s*\/>/.test(rPr),
      underline: /<w:u\s*\/>/.test(rPr),
      strike: /<w:strike\s*\/>/.test(rPr),
      color: /<w:color\s+w:val="([^"]+)"/.exec(rPr)?.[1],
      highlight: /<w:highlight\s+w:val="([^"]+)"/.exec(rPr)?.[1],
      size: /<w:sz\s+w:val="([^"]+)"/.exec(rPr)?.[1],
      font: /<w:rFonts[^>]*w:ascii="([^"]+)"/.exec(rPr)?.[1],
    };
  }

  /**
   * Processes text content
   * @param {string} text - Text content
   * @returns {string}
   */
  function processText(text) {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\s+/g, " ")
      .replace(/[\n\r]/g, " ");
  }

  try {
    // Extract paragraph properties
    const pPrMatch = /<w:pPr>([\s\S]*?)<\/w:pPr>/.exec(xml);
    const paragraphStyle = getParagraphStyle(pPrMatch?.[1]);

    // Extract and merge paragraph style from style definitions
    const styleId = paragraphStyle.styleId;
    if (styleId && context.styles?.paragraph?.[styleId]) {
      Object.assign(paragraphStyle, context.styles.paragraph[styleId]);
    }

    // Parse runs (text spans)
    const runs = [];
    const runRegex = /<w:r\b[^>]*>([\s\S]*?)<\/w:r>/g;
    let runMatch;

    while ((runMatch = runRegex.exec(xml)) !== null) {
      const runXml = runMatch[1];

      // Extract run properties
      const rPrMatch = /<w:rPr>([\s\S]*?)<\/w:rPr>/.exec(runXml);
      const runStyle = getRunStyle(rPrMatch?.[1]);

      // Extract text content
      const textMatch = /<w:t\b[^>]*>([\s\S]*?)<\/w:t>/.exec(runXml);
      if (textMatch) {
        const text = processText(textMatch[1]);
        if (text.trim()) {
          runs.push({
            type: "text",
            text,
            style: runStyle,
          });
        }
      }

      // Handle special elements
      if (/<w:tab\/>/.test(runXml)) {
        runs.push({ type: "tab" });
      }
      if (/<w:br\/>/.test(runXml)) {
        runs.push({ type: "break" });
      }

      // Handle hyperlinks
      const hyperlinkMatch = /<w:hyperlink\s+r:id="([^"]+)"/.exec(runXml);
      if (hyperlinkMatch && context.relationships) {
        const relationshipId = hyperlinkMatch[1];
        const target = context.relationships[relationshipId];
        if (target) {
          runs.push({
            type: "hyperlink",
            target,
            style: runStyle,
          });
        }
      }
    }

    // Skip empty paragraphs unless they contain significant formatting
    if (runs.length === 0 && !paragraphStyle.pageBreakBefore) {
      return null;
    }

    return {
      type: "paragraph",
      style: paragraphStyle,
      content: runs,
    };
  } catch (error) {
    console.warn("Error parsing paragraph:", error);
    return null;
  }
}

/**
 * Converts parsed DOCX content into HTML
 * @param {Array} content - Array of parsed content blocks
 * @param {Object} styles - Document style definitions
 * @returns {string} Generated HTML
 */
function generateHtml(content, styles) {
  /**
   * Converts style object to CSS string
   * @param {Object} style - Style properties
   * @returns {string} CSS string
   */
  function styleToCSS(style) {
    if (!style) return "";

    const cssMap = {
      alignment: "text-align",
      color: "color",
      highlight: "background-color",
      size: (value) => `font-size: ${parseInt(value) / 2}pt`,
      spacing: (value) => `line-height: ${parseInt(value) / 240}`,
      indentation: (value) => `margin-left: ${parseInt(value) / 20}pt`,
      font: "font-family",
    };

    return Object.entries(style)
      .map(([key, value]) => {
        // Skip null/undefined values
        if (value == null) return "";

        // Handle boolean properties
        if (key === "bold") return value ? "font-weight: bold" : "";
        if (key === "italic") return value ? "font-style: italic" : "";
        if (key === "underline")
          return value ? "text-decoration: underline" : "";
        if (key === "strike")
          return value ? "text-decoration: line-through" : "";

        // Handle mapped properties
        const cssProperty = cssMap[key];
        if (!cssProperty) return "";

        if (typeof cssProperty === "function") {
          return cssProperty(value);
        }

        return `${cssProperty}: ${value}`;
      })
      .filter(Boolean)
      .join("; ");
  }

  /**
   * Generates HTML for a text run
   * @param {Object} run - Text run object
   * @returns {string} HTML string
   */
  function generateRunHtml(run) {
    if (!run) return "";

    switch (run.type) {
      case "text": {
        const style = styleToCSS(run.style);
        return style ? `<span style="${style}">${run.text}</span>` : run.text;
      }

      case "tab":
        return "&nbsp;&nbsp;&nbsp;&nbsp;";

      case "break":
        return "<br>";

      case "hyperlink": {
        const style = styleToCSS(run.style);
        return `<a href="${run.target}"${style ? ` style="${style}"` : ""}>${run.text || run.target}</a>`;
      }

      default:
        return "";
    }
  }

  /**
   * Generates HTML for a paragraph
   * @param {Object} paragraph - Paragraph object
   * @returns {string} HTML string
   */
  function generateParagraphHtml(paragraph) {
    if (!paragraph?.content) return "";

    const style = styleToCSS(paragraph.style);
    const content = paragraph.content
      .map((run) => generateRunHtml(run))
      .join("");

    // Handle special paragraph types based on style
    const styleId = paragraph.style?.styleId;
    if (styleId && styles?.paragraph?.[styleId]) {
      const baseStyle = styles.paragraph[styleId];

      // Convert headings
      if (baseStyle.heading) {
        const level = parseInt(styleId.match(/Heading(\d+)/)?.[1] || "1");
        return `<h${level}${style ? ` style="${style}"` : ""}>${content}</h${level}>`;
      }
    }

    // Force page break if specified
    if (paragraph.style?.pageBreakBefore) {
      return `<div style="page-break-before: always"></div><p${style ? ` style="${style}"` : ""}>${content}</p>`;
    }

    return `<p${style ? ` style="${style}"` : ""}>${content}</p>`;
  }

  /**
   * Generates HTML for a table
   * @param {Object} table - Table object
   * @returns {string} HTML string
   */
  function generateTableHtml(table) {
    if (!table?.rows) return "";

    const style = styleToCSS(table.style);
    const rows = table.rows
      .map((row, rowIndex) => {
        const cells = row.cells
          .map((cell, cellIndex) => {
            const cellStyle = styleToCSS({
              ...cell.style,
              width: cell.width ? `${cell.width}pt` : undefined,
            });

            const content = cell.content
              .map((block) => {
                switch (block.type) {
                  case "paragraph":
                    return generateParagraphHtml(block);
                  default:
                    return "";
                }
              })
              .join("");

            return `<td${cellStyle ? ` style="${cellStyle}"` : ""}>${content}</td>`;
          })
          .join("");

        // Add row styles based on position
        const rowClasses = [];
        if (rowIndex === 0 && table.style?.firstRow)
          rowClasses.push(TABLE_STYLES.firstRow);
        if (rowIndex === table.rows.length - 1 && table.style?.lastRow)
          rowClasses.push(TABLE_STYLES.lastRow);
        if (rowIndex % 2 === 0) rowClasses.push(TABLE_STYLES.evenRow);
        else rowClasses.push(TABLE_STYLES.oddRow);

        return `<tr${rowClasses.length ? ` class="${rowClasses.join(" ")}"` : ""}>${cells}</tr>`;
      })
      .join("");

    return `<table${style ? ` style="${style}"` : ""}>${rows}</table>`;
  }

  /**
   * Generates HTML for a section
   * @param {Object} section - Section object
   * @returns {string} HTML string
   */
  function generateSectionHtml(section) {
    if (!section?.content) return "";

    const blocks = section.content
      .map((block) => {
        switch (block.type) {
          case "paragraph":
            return generateParagraphHtml(block);
          case "table":
            return generateTableHtml(block);
          default:
            return "";
        }
      })
      .filter(Boolean)
      .join("\n");

    const style = styleToCSS(section.style);
    return `<section${style ? ` style="${style}"` : ""}>${blocks}</section>`;
  }

  // Generate document-level styles
  let css = "";
  if (styles?.document) {
    const documentStyle = styleToCSS(styles.document);
    if (documentStyle) {
      css = `<style>
        body {
          ${documentStyle}
        }
        ${Object.entries(TABLE_STYLES)
          .map(
            ([key, className]) => `
          .${className} {
            ${styles.table?.[key] ? styleToCSS(styles.table[key]) : ""}
          }
        `,
          )
          .join("\n")}
      </style>`;
    }
  }

  // Generate content HTML
  const bodyContent = content
    .map((block) => {
      switch (block.type) {
        case "section":
          return generateSectionHtml(block);
        case "paragraph":
          return generateParagraphHtml(block);
        case "table":
          return generateTableHtml(block);
        default:
          return "";
      }
    })
    .filter(Boolean)
    .join("\n");

  return `<!DOCTYPE html>
    <html>
    <head>
    <meta charset="UTF-8">
    ${css}
    </head>
    <body>
    ${bodyContent}
    </body>
    </html>`;
}

/**
 * Detects if a binary buffer is a DOCX file by checking the file signature
 * DOCX files are ZIP archives with specific internal structure
 *
 * @param {ArrayBuffer|Buffer|Uint8Array} buffer - Binary buffer to check
 * @returns {boolean} True if buffer appears to be a DOCX file
 * @category Extract
 */
export function isBufferDOCX(buffer) {
  if (!buffer) return false;

  try {
    // Convert to Uint8Array for consistent access
    const uint8Array =
      buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);

    // Check minimum length (DOCX files are ZIP archives, need at least ZIP header)
    if (uint8Array.length < 30) return false;

    // Check ZIP file signature (PK header)
    // ZIP files start with "PK" (0x504B)
    if (uint8Array[0] !== 0x50 || uint8Array[1] !== 0x4b) return false;

    // Check if it's a ZIP file (central directory or local file header)
    const signature = (uint8Array[2] << 8) | uint8Array[3];
    if (signature !== 0x0304 && signature !== 0x0201) return false;

    // For DOCX, we need to check if it contains the required DOCX structure
    // This is a more thorough check that looks for DOCX-specific files
    const bufferString = new TextDecoder("utf-8", { fatal: false }).decode(
      uint8Array.slice(0, Math.min(1024, uint8Array.length)),
    );

    // Look for DOCX-specific markers in the ZIP structure
    // DOCX files should contain references to word/document.xml
    return (
      bufferString.includes("word/document.xml") ||
      bufferString.includes("word/styles.xml") ||
      bufferString.includes("[Content_Types].xml")
    );
  } catch (error) {
    // If we can't parse the buffer, assume it's not a DOCX
    return false;
  }
}
