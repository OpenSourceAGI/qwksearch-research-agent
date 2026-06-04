/**
 * @description Abstract base class for all page-level document nodes (`TextItem`,
 * `LineItem`, `LineItemBlock`). Carries the shared fields `type` (semantic block
 * category from `BlockType`), `annotation` (diff marker for debug rendering), and
 * `parsedElements` (inline footnote/link metadata). Throws `TypeError` if
 * instantiated directly.
 */
import Annotation from "./annotation";
import ParsedElements from "./parsed-elements";

export interface BlockTypeEntry {
  name: string;
  headline?: boolean;
  headlineLevel?: number;
  mergeToBlock?: boolean;
  mergeFollowingNonTypedItems?: boolean;
  mergeFollowingNonTypedItemsWithSmallDistance?: boolean;
  toText?(block: any): string;
}

// A abstract PageItem class, can be TextItem, LineItem or LineItemBlock
export default class PageItem {
  type: BlockTypeEntry | null;
  annotation: Annotation | null;
  parsedElements: ParsedElements | null;

  constructor(options: { type?: BlockTypeEntry | null; annotation?: Annotation | null; parsedElements?: ParsedElements | null }) {
    if (this.constructor === PageItem) {
      throw new TypeError("Can not construct abstract class.");
    }
    this.type = options.type ?? null;
    this.annotation = options.annotation ?? null;
    this.parsedElements = options.parsedElements ?? null;
  }
}

