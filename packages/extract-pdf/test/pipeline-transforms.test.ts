import { describe, expect, it } from "bun:test";
import { REMOVED_ANNOTATION } from "../src/models/annotation";
import BlockType from "../src/models/block-type";
import LineItem from "../src/models/line-item";
import Page from "../src/models/page";
import ParseResult from "../src/models/parse-result";
import TextItem from "../src/models/text-item";
import { WordFormat } from "../src/models/line-converter";
import CalculateGlobalStats from "../src/transforms/calculate-global-stats";
import GatherBlocks from "../src/transforms/block/gather-blocks";
import RemoveRepetitiveElements from "../src/transforms/line-item/remove-repetitive-elements";

const pages = (...pageItems: any[][]) =>
  new ParseResult({
    pages: pageItems.map((items, index) => new Page({ index, items })),
  });

const textItem = (options: Partial<ConstructorParameters<typeof TextItem>[0]>) =>
  new TextItem({
    x: 0,
    y: 0,
    width: 10,
    height: 10,
    text: "text",
    font: "f1",
    ...options,
  } as any);

describe("CalculateGlobalStats", () => {
  it("reports the most used height and font", () => {
    const result = new CalculateGlobalStats().transform(
      pages([
        textItem({ height: 10, font: "body" }),
        textItem({ height: 10, font: "body" }),
        textItem({ height: 20, font: "title" }),
      ]),
    );

    expect(result.globals.mostUsedHeight).toBe(10);
    expect(result.globals.mostUsedFont).toBe("body");
  });

  it("reports the tallest item and its font", () => {
    const result = new CalculateGlobalStats().transform(
      pages([textItem({ height: 10 }), textItem({ height: 30, font: "huge" })]),
    );

    expect(result.globals.maxHeight).toBe(30);
    expect(result.globals.maxHeightFont).toBe("huge");
  });

  it("skips items with no height", () => {
    const result = new CalculateGlobalStats().transform(
      pages([textItem({ height: 0 }), textItem({ height: 12 })]),
    );

    expect(result.globals.mostUsedHeight).toBe(12);
  });

  it("computes the most common line distance", () => {
    const result = new CalculateGlobalStats().transform(
      pages([
        textItem({ height: 10, y: 300 }),
        textItem({ height: 10, y: 288 }),
        textItem({ height: 10, y: 276 }),
      ]),
    );

    expect(result.globals.mostUsedDistance).toBe(12);
  });

  it("ignores distances across a non-body-height item", () => {
    const result = new CalculateGlobalStats().transform(
      pages([
        textItem({ height: 10, y: 300 }),
        textItem({ height: 30, y: 280 }),
        textItem({ height: 10, y: 260 }),
      ]),
    );

    expect(Number.isNaN(result.globals.mostUsedDistance)).toBe(true);
  });

  it("deep-copies page items so later stages cannot mutate the input", () => {
    const original = textItem({ height: 10 });
    const result = new CalculateGlobalStats().transform(pages([original]));

    expect(result.pages[0].items[0]).not.toBe(original);
    expect(result.pages[0].items[0].text).toBe("text");
  });

  it("emits diagnostic messages", () => {
    const result = new CalculateGlobalStats().transform(pages([textItem({ height: 10 })]));

    expect(result.messages[0]).toContain("Items per height");
    expect(result.messages[3]).toContain("Fonts:");
  });

  it("derives inline formats from the font map", () => {
    const fontMap = new Map([
      ["body", { name: "Helvetica" }],
      ["b", { name: "Helvetica-Bold" }],
      ["i", { name: "Helvetica-Oblique" }],
      ["bi", { name: "Helvetica-BoldItalic" }],
      ["plain", { name: "Times-Roman" }],
    ]);

    const result = new CalculateGlobalStats(fontMap).transform(
      pages([textItem({ height: 10, font: "body" }), textItem({ height: 10, font: "body" })]),
    );
    const formats = result.globals.fontToFormats!;

    expect(formats.get("b")).toBe(WordFormat.BOLD.name);
    expect(formats.get("i")).toBe(WordFormat.OBLIQUE.name);
    expect(formats.get("bi")).toBe(WordFormat.BOLD_OBLIQUE.name);
    expect(formats.has("body")).toBe(false);
    expect(formats.has("plain")).toBe(false);
  });

  it("treats the tallest font as bold when its name says nothing", () => {
    const fontMap = new Map([
      ["body", { name: "body" }],
      ["title", { name: "title" }],
    ]);

    const result = new CalculateGlobalStats(fontMap).transform(
      pages([
        textItem({ height: 10, font: "body" }),
        textItem({ height: 10, font: "body" }),
        textItem({ height: 40, font: "title" }),
      ]),
    );

    expect(result.globals.fontToFormats!.get("title")).toBe(WordFormat.BOLD.name);
  });
});

describe("GatherBlocks", () => {
  const line = (options: Record<string, any>) => new LineItem({ x: 10, ...options });

  it("groups untyped lines that sit close together into one block", () => {
    const result = new GatherBlocks().transform(
      new ParseResult({
        pages: [
          new Page({
            index: 0,
            items: [line({ y: 300, text: "a" }), line({ y: 288, text: "b" })],
          }),
        ],
        globals: { mostUsedDistance: 12 },
      }),
    );

    expect(result.pages[0].items).toHaveLength(1);
    expect(result.pages[0].items[0].items).toHaveLength(2);
    expect(result.messages[0]).toContain("Gathered 1 blocks out of 2 line items");
  });

  it("splits when the vertical gap is large", () => {
    const result = new GatherBlocks().transform(
      new ParseResult({
        pages: [
          new Page({
            index: 0,
            items: [line({ y: 300, text: "a" }), line({ y: 100, text: "b" })],
          }),
        ],
        globals: { mostUsedDistance: 12 },
      }),
    );

    expect(result.pages[0].items).toHaveLength(2);
  });

  it("splits when the item type changes", () => {
    const result = new GatherBlocks().transform(
      new ParseResult({
        pages: [
          new Page({
            index: 0,
            items: [
              line({ y: 300, text: "a", type: BlockType.H1 }),
              line({ y: 288, text: "b" }),
            ],
          }),
        ],
        globals: { mostUsedDistance: 12 },
      }),
    );

    expect(result.pages[0].items).toHaveLength(2);
    expect(result.pages[0].items[0].type).toBe(BlockType.H1);
  });

  it("keeps headline lines in separate blocks", () => {
    const result = new GatherBlocks().transform(
      new ParseResult({
        pages: [
          new Page({
            index: 0,
            items: [
              line({ y: 300, text: "a", type: BlockType.H1 }),
              line({ y: 288, text: "b", type: BlockType.H1 }),
            ],
          }),
        ],
        globals: { mostUsedDistance: 12 },
      }),
    );

    expect(result.pages[0].items).toHaveLength(2);
  });

  it("merges untyped lines into a FOOTNOTES block", () => {
    const result = new GatherBlocks().transform(
      new ParseResult({
        pages: [
          new Page({
            index: 0,
            items: [
              line({ y: 300, text: "note", type: BlockType.FOOTNOTES }),
              line({ y: 100, text: "continued" }),
            ],
          }),
        ],
        globals: { mostUsedDistance: 12 },
      }),
    );

    expect(result.pages[0].items).toHaveLength(1);
  });

  it("merges a close untyped line into a LIST block but splits a distant one", () => {
    const close = new GatherBlocks().transform(
      new ParseResult({
        pages: [
          new Page({
            index: 0,
            items: [
              line({ y: 300, text: "- item", type: BlockType.LIST }),
              line({ y: 290, text: "wrapped" }),
            ],
          }),
        ],
        globals: { mostUsedDistance: 12 },
      }),
    );
    expect(close.pages[0].items).toHaveLength(1);

    const far = new GatherBlocks().transform(
      new ParseResult({
        pages: [
          new Page({
            index: 0,
            items: [
              line({ y: 300, text: "- item", type: BlockType.LIST }),
              line({ y: 100, text: "separate" }),
            ],
          }),
        ],
        globals: { mostUsedDistance: 12 },
      }),
    );
    expect(far.pages[0].items).toHaveLength(2);
  });

  it("splits when the next line sits above the previous one", () => {
    const result = new GatherBlocks().transform(
      new ParseResult({
        pages: [
          new Page({
            index: 0,
            items: [line({ y: 100, text: "a" }), line({ y: 300, text: "b" })],
          }),
        ],
        globals: { mostUsedDistance: 12 },
      }),
    );

    expect(result.pages[0].items).toHaveLength(2);
  });

  it("produces no blocks for an empty page", () => {
    const result = new GatherBlocks().transform(
      new ParseResult({
        pages: [new Page({ index: 0, items: [] })],
        globals: { mostUsedDistance: 12 },
      }),
    );

    expect(result.pages[0].items).toEqual([]);
  });
});

describe("RemoveRepetitiveElements", () => {
  const header = (text: string) => new LineItem({ y: 700, text });
  const footer = (text: string) => new LineItem({ y: 50, text });
  const body = (text: string) => new LineItem({ y: 400, text });

  function page(index: number, headerText: string, footerText: string) {
    return new Page({ index, items: [header(headerText), body("content"), footer(footerText)] });
  }

  it("removes a header repeated across most pages", () => {
    const result = new RemoveRepetitiveElements().transform(
      new ParseResult({
        pages: [
          page(0, "My Book", "Page 1"),
          page(1, "My Book", "Page 2"),
          page(2, "My Book", "Page 3"),
        ],
      }),
    );

    for (const p of result.pages) {
      expect(p.items[0].annotation).toBe(REMOVED_ANNOTATION);
      expect(p.items[1].annotation).toBeNull();
    }
    expect(result.messages[0]).toBe("Removed Header: 3");
  });

  it("ignores digits so page numbers still match", () => {
    const result = new RemoveRepetitiveElements().transform(
      new ParseResult({
        pages: [
          page(0, "Chapter 1", "1"),
          page(1, "Chapter 2", "2"),
          page(2, "Chapter 3", "3"),
        ],
      }),
    );

    expect(result.pages[0].items[0].annotation).toBe(REMOVED_ANNOTATION);
  });

  it("leaves distinct headers alone", () => {
    const result = new RemoveRepetitiveElements().transform(
      new ParseResult({
        pages: [
          page(0, "Alpha", "one"),
          page(1, "Beta", "two"),
          page(2, "Gamma", "three"),
        ],
      }),
    );

    expect(result.pages[0].items[0].annotation).toBeNull();
    expect(result.messages[0]).toBe("Removed Header: 0");
  });

  it("needs at least three pages before removing anything", () => {
    const result = new RemoveRepetitiveElements().transform(
      new ParseResult({ pages: [page(0, "My Book", "1"), page(1, "My Book", "2")] }),
    );

    expect(result.pages[0].items[0].annotation).toBeNull();
  });

  it("groups every line sharing the topmost y", () => {
    const twoUp = (index: number) =>
      new Page({
        index,
        items: [header("My Book"), header("Draft"), body("content"), footer("x")],
      });

    const result = new RemoveRepetitiveElements().transform(
      new ParseResult({ pages: [twoUp(0), twoUp(1), twoUp(2)] }),
    );

    expect(result.pages[0].items[0].annotation).toBe(REMOVED_ANNOTATION);
    expect(result.pages[0].items[1].annotation).toBe(REMOVED_ANNOTATION);
  });
});
