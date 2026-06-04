/**
 * @description A single raw text span extracted from a PDF page, carrying spatial
 * coordinates (x, y, width, height), the text string, the font name, and optional
 * inline format markers (lineFormat, unopenedFormat, unclosedFormat) used by the
 * line-compaction pipeline to track bold/italic spans that cross item boundaries.
 */
import PageItem, { BlockTypeEntry } from "./page-item";
import Annotation from "./annotation";
import ParsedElements from "./parsed-elements";
import { WordFormatEntry } from "./word";

export default class TextItem extends PageItem {
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  font: string;
  lineFormat: WordFormatEntry | null;
  unopenedFormat: WordFormatEntry | null;
  unclosedFormat: WordFormatEntry | null;

  constructor(options: {
    x: number;
    y: number;
    width: number;
    height: number;
    text: string;
    font: string;
    lineFormat?: WordFormatEntry | null;
    unopenedFormat?: WordFormatEntry | null;
    unclosedFormat?: WordFormatEntry | null;
    type?: BlockTypeEntry | null;
    annotation?: Annotation | null;
    parsedElements?: ParsedElements | null;
  }) {
    super(options);
    this.x = options.x;
    this.y = options.y;
    this.width = options.width;
    this.height = options.height;
    this.text = options.text;
    this.font = options.font;

    this.lineFormat = options.lineFormat ?? null;
    this.unopenedFormat = options.unopenedFormat ?? null;
    this.unclosedFormat = options.unclosedFormat ?? null;
  }
}

