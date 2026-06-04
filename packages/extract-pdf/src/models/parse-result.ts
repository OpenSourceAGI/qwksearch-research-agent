/**
 * @description Immutable value object passed between every pipeline stage.
 * `pages` holds the document's page array (items mutate in type each stage),
 * `globals` holds cross-page statistics computed by `CalculateGlobalStats`
 * (most-used height, font, line distance, font-format map), and `messages`
 * carries diagnostic strings emitted by each transformation for debugging.
 */
import Page from "./page";

export interface ParseGlobals {
  mostUsedHeight?: number;
  mostUsedFont?: string;
  mostUsedDistance?: number;
  maxHeight?: number;
  maxHeightFont?: string;
  fontToFormats?: Map<string, string>;
  tocPages?: number[];
  headlineTypeToHeightRange?: Record<string, { min: number; max: number }>;
}

// The result of a PDF parse respectively a Transformation
export default class ParseResult {
  pages: Page[];
  globals: ParseGlobals;
  messages: string[];

  constructor(options: { pages?: Page[]; globals?: ParseGlobals; messages?: string[] }) {
    this.pages = options.pages || [];
    this.globals = options.globals || {};
    this.messages = options.messages || [];
  }
}
