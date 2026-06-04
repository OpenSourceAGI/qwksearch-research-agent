/**
 * @description A semantically coherent group of `LineItem`s that share the same
 * block type (paragraph, list, heading, etc.). Extends `PageItem`. `addItem`
 * enforces type consistency across all lines, merges `ParsedElements` metadata
 * from each line into the block, and strips the type tag from individual lines
 * so only the block-level type is authoritative.
 */
import PageItem, { BlockTypeEntry } from "./page-item";
import Annotation from "./annotation";
import ParsedElements from "./parsed-elements";
import LineItem from "./line-item";

// A block of LineItem[] within a Page
export default class LineItemBlock extends PageItem {
  items: LineItem[];

  constructor(options: {
    items?: LineItem[];
    type?: BlockTypeEntry | null;
    annotation?: Annotation | null;
    parsedElements?: ParsedElements | null;
  }) {
    super(options);
    this.items = [];
    if (options.items) {
      options.items.forEach((item) => this.addItem(item));
    }
  }

  addItem(item: LineItem): void {
    if (this.type && item.type && this.type !== item.type) {
      throw new Error(
        `Adding item of type ${item.type.name} to block of type ${this.type.name}`,
      );
    }
    if (!this.type) {
      this.type = item.type;
    }
    if (item.parsedElements) {
      if (this.parsedElements) {
        this.parsedElements.add(item.parsedElements);
      } else {
        this.parsedElements = item.parsedElements;
      }
    }
    const copiedItem = new LineItem({ ...item });
    copiedItem.type = null;
    this.items.push(copiedItem);
  }
}

