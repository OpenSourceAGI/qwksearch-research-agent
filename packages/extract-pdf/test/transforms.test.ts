import { describe, expect, it } from "bun:test";
import { ADDED_ANNOTATION, REMOVED_ANNOTATION } from "../src/models/annotation";
import BlockType from "../src/models/block-type";
import LineItem from "../src/models/line-item";
import LineItemBlock from "../src/models/line-item-block";
import Page from "../src/models/page";
import ParseResult from "../src/models/parse-result";
import TextItem from "../src/models/text-item";
import Transformation from "../src/transforms/base/transformation";
import ToLineItemTransformation from "../src/transforms/base/to-line-item-transform";
import ToLineItemBlockTransformation from "../src/transforms/base/to-line-item-block-transform";
import ToTextItemTransformation from "../src/transforms/base/to-text-item-transform";
import DetectListItems from "../src/transforms/line-item/detect-list-items";
import DetectCodeQuoteBlocks from "../src/transforms/block/detect-code-quote-blocks";
import DetectListLevels from "../src/transforms/block/detect-list-levels";
import ToTextBlocks from "../src/transforms/to-text-blocks";
import ToHTML from "../src/transforms/to-html";

const resultWith = (items: any[], globals: any = {}) =>
  new ParseResult({ pages: [new Page({ index: 0, items })], globals });

describe("Transformation", () => {
  it("refuses direct construction", () => {
    expect(() => new (Transformation as any)("x", "y")).toThrow(TypeError);
  });

  it("refuses a subclass that does not implement transform", () => {
    class NoTransform extends Transformation {}

    expect(() => new NoTransform("x", "y")).toThrow(/implement abstract method/);
  });

  it("throws if the abstract transform is called directly", () => {
    class Concrete extends Transformation {
      transform(parseResult: ParseResult): ParseResult {
        return parseResult;
      }
    }
    const instance = new Concrete("name", "Item");

    expect(instance.name).toBe("name");
    expect(instance.itemType).toBe("Item");
    expect(() => Transformation.prototype.transform.call(instance, resultWith([]))).toThrow(
      TypeError,
    );
  });

  it("clears messages in the default completeTransform", () => {
    class Concrete extends Transformation {
      transform(parseResult: ParseResult): ParseResult {
        return parseResult;
      }
    }

    const result = new ParseResult({ messages: ["a", "b"] });

    expect(new Concrete("n", "I").completeTransform(result).messages).toEqual([]);
  });
});

describe("abstract transform bases", () => {
  const bases = [
    ["ToLineItemTransformation", ToLineItemTransformation, "LineItem"],
    ["ToLineItemBlockTransformation", ToLineItemBlockTransformation, "LineItemBlock"],
    ["ToTextItemTransformation", ToTextItemTransformation, "TextItem"],
  ] as const;

  for (const [name, Base, itemType] of bases) {
    it(`${name} refuses direct construction`, () => {
      expect(() => new (Base as any)("x")).toThrow(TypeError);
    });

    it(`${name} tags its item type and strips removed items`, () => {
      class Concrete extends (Base as any) {
        transform(parseResult: ParseResult): ParseResult {
          return parseResult;
        }
      }
      const instance = new Concrete("n") as any;
      expect(instance.itemType).toBe(itemType);

      const kept = new LineItem({ text: "kept", annotation: ADDED_ANNOTATION });
      const dropped = new LineItem({ text: "dropped", annotation: REMOVED_ANNOTATION });
      const result = instance.completeTransform(resultWith([kept, dropped]));

      expect(result.pages[0].items).toHaveLength(1);
      expect(result.pages[0].items[0].text()).toBe("kept");
      expect(result.pages[0].items[0].annotation).toBeNull();
      expect(result.messages).toEqual([]);
    });
  }
});

describe("DetectListItems", () => {
  it("marks a dash-bulleted line as a list item", () => {
    const item = new LineItem({ text: "- first" });

    const result = new DetectListItems().transform(resultWith([item]));

    expect(result.pages[0].items[0].type).toBe(BlockType.LIST);
    expect(result.messages[0]).toContain("Detected 1 plain list items");
  });

  it("normalises a bullet character to a dash on a replacement line", () => {
    const item = new LineItem({ text: "• first" });

    const result = new DetectListItems().transform(resultWith([item]));
    const items = result.pages[0].items;

    expect(items).toHaveLength(2);
    expect(items[0].annotation).toBe(REMOVED_ANNOTATION);
    expect(items[1].annotation).toBe(ADDED_ANNOTATION);
    expect(items[1].type).toBe(BlockType.LIST);
    expect(items[1].wordStrings()[0]).toBe("-");
  });

  it("marks a numbered line as a list item", () => {
    const result = new DetectListItems().transform(
      resultWith([new LineItem({ text: "1. first" })]),
    );

    expect(result.pages[0].items[0].type).toBe(BlockType.LIST);
    expect(result.messages[1]).toContain("Detected 1 numbered list items");
  });

  it("leaves ordinary prose alone", () => {
    const result = new DetectListItems().transform(
      resultWith([new LineItem({ text: "just a sentence" })]),
    );

    expect(result.pages[0].items[0].type).toBeNull();
  });

  it("skips lines that already carry a type", () => {
    const result = new DetectListItems().transform(
      resultWith([new LineItem({ text: "- first", type: BlockType.H1 })]),
    );

    expect(result.pages[0].items[0].type).toBe(BlockType.H1);
  });
});

describe("DetectCodeQuoteBlocks", () => {
  const indentedBlock = (xs: number[], height = 10) =>
    new LineItemBlock({ items: xs.map((x) => new LineItem({ x, height, text: "code" })) });

  it("marks a block whose lines are all indented past the page minimum", () => {
    const flush = indentedBlock([10]);
    const indented = indentedBlock([40, 40]);

    const result = new DetectCodeQuoteBlocks().transform(
      resultWith([flush, indented], { mostUsedHeight: 10 }),
    );

    expect(result.pages[0].items[1].type).toBe(BlockType.CODE);
    expect(result.messages[0]).toContain("Detected 1 code/quote items");
  });

  it("leaves a block that touches the left margin alone", () => {
    const result = new DetectCodeQuoteBlocks().transform(
      resultWith([indentedBlock([10, 40])], { mostUsedHeight: 10 }),
    );

    expect(result.pages[0].items[0].type).toBeNull();
  });

  it("treats a single indented body-height line as code", () => {
    const result = new DetectCodeQuoteBlocks().transform(
      resultWith([indentedBlock([10]), indentedBlock([40])], { mostUsedHeight: 10 }),
    );

    expect(result.pages[0].items[1].type).toBe(BlockType.CODE);
  });

  it("rejects a single indented line that is taller than body text", () => {
    const result = new DetectCodeQuoteBlocks().transform(
      resultWith([indentedBlock([10]), indentedBlock([40], 30)], { mostUsedHeight: 10 }),
    );

    expect(result.pages[0].items[1].type).toBeNull();
  });

  it("ignores empty blocks and already-typed blocks", () => {
    const empty = new LineItemBlock({});
    const typed = new LineItemBlock({
      type: BlockType.PARAGRAPH,
      items: [new LineItem({ x: 40, height: 10, text: "x" })],
    });

    const result = new DetectCodeQuoteBlocks().transform(
      resultWith([new LineItemBlock({ items: [new LineItem({ x: 10, height: 10 })] }), empty, typed], {
        mostUsedHeight: 10,
      }),
    );

    expect(result.pages[0].items[1].type).toBeNull();
    expect(result.pages[0].items[2].type).toBe(BlockType.PARAGRAPH);
  });
});

describe("DetectListLevels", () => {
  it("indents lines that start further right than the previous one", () => {
    const block = new LineItemBlock({
      type: BlockType.LIST,
      items: [
        new LineItem({ x: 10, text: "- top" }),
        new LineItem({ x: 30, text: "- nested" }),
      ],
    });

    const result = new DetectListLevels().transform(resultWith([block]));
    const items = result.pages[0].items[0].items;

    expect(items[0].text()).toBe("- top");
    expect(items[1].wordStrings()[0]).toBe("   ");
    expect(result.messages[0]).toContain("Modified 1 / 1 list blocks");
  });

  it("returns to the previous level when x moves back left", () => {
    const block = new LineItemBlock({
      type: BlockType.LIST,
      items: [
        new LineItem({ x: 10, text: "- a" }),
        new LineItem({ x: 30, text: "- b" }),
        new LineItem({ x: 10, text: "- c" }),
      ],
    });

    const result = new DetectListLevels().transform(resultWith([block]));
    const items = result.pages[0].items[0].items;

    expect(items[2].wordStrings()[0]).toBe("-");
  });

  it("leaves a flat list untouched", () => {
    const block = new LineItemBlock({
      type: BlockType.LIST,
      items: [new LineItem({ x: 10, text: "- a" }), new LineItem({ x: 10, text: "- b" })],
    });

    const result = new DetectListLevels().transform(resultWith([block]));

    expect(result.messages[0]).toContain("Modified 0 / 1 list blocks");
  });

  it("ignores blocks that are not lists", () => {
    const block = new LineItemBlock({
      type: BlockType.PARAGRAPH,
      items: [new LineItem({ x: 10, text: "a" })],
    });

    const result = new DetectListLevels().transform(resultWith([block]));

    expect(result.messages[0]).toContain("Modified 0 / 0 list blocks");
  });
});

describe("ToTextBlocks", () => {
  it("flattens blocks into category/text pairs", () => {
    const result = new ToTextBlocks().transform(
      resultWith([
        new LineItemBlock({ type: BlockType.H1, items: [new LineItem({ text: "Title" })] }),
        new LineItemBlock({
          type: BlockType.PARAGRAPH,
          items: [new LineItem({ text: "Body" })],
        }),
      ]),
    );

    expect(result.pages[0].items[0].category).toBe("H1");
    expect(result.pages[0].items[0].text).toContain("Title");
    expect(result.pages[0].items[1].category).toBe("PARAGRAPH");
  });

  it("labels untyped blocks Unknown", () => {
    const result = new ToTextBlocks().transform(
      resultWith([new LineItemBlock({ items: [new LineItem({ text: "loose" })] })]),
    );

    expect(result.pages[0].items[0].category).toBe("Unknown");
  });
});

describe("ToHTML", () => {
  it("wraps each block in a paragraph", () => {
    const result = new ToHTML().transform(
      resultWith([{ category: "PARAGRAPH", text: "Hello world" }]),
    );

    expect(result.pages[0].items[0]).toContain("<p>Hello world</p>");
  });

  it("rejoins words broken across a hyphenated line break", () => {
    const result = new ToHTML().transform(
      resultWith([{ category: "PARAGRAPH", text: "hyphen- ated" }]),
    );

    expect(result.pages[0].items[0]).toContain("<p>hyphenated</p>");
  });

  it("keeps hyphens inside list blocks", () => {
    const result = new ToHTML().transform(
      resultWith([{ category: "LIST", text: "- item" }]),
    );

    expect(result.pages[0].items[0]).toContain("- item");
  });

  it("strips the code fencing from CODE blocks", () => {
    const result = new ToHTML().transform(
      resultWith([{ category: "CODE", text: "<code>x = 1</code>" }]),
    );

    expect(result.pages[0].items[0]).toBe("<p>x = 1</p>\n\n");
  });

  it("passes TOC text through verbatim", () => {
    const result = new ToHTML().transform(
      resultWith([{ category: "TOC", text: "Chapter\r\n1" }]),
    );

    expect(result.pages[0].items[0]).toContain("Chapter\r\n1");
  });

  it("concatenates several blocks onto one page string", () => {
    const result = new ToHTML().transform(
      resultWith([
        { category: "PARAGRAPH", text: "one" },
        { category: "PARAGRAPH", text: "two" },
      ]),
    );

    expect(result.pages[0].items).toHaveLength(1);
    expect(result.pages[0].items[0]).toBe("<p>one</p>\n\n<p>two</p>\n\n");
  });
});

describe("TextItem in the pipeline", () => {
  it("survives a completeTransform pass", () => {
    class Concrete extends ToTextItemTransformation {
      transform(parseResult: ParseResult): ParseResult {
        return parseResult;
      }
    }

    const item = new TextItem({ x: 0, y: 0, width: 1, height: 1, text: "x", font: "F" });
    const result = new Concrete("n").completeTransform(resultWith([item]));

    expect(result.pages[0].items).toEqual([item]);
  });
});
