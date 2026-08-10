import { describe, expect, it } from "bun:test";
import Annotation, {
  ADDED_ANNOTATION,
  DETECTED_ANNOTATION,
  MODIFIED_ANNOTATION,
  REMOVED_ANNOTATION,
  UNCHANGED_ANNOTATION,
} from "../src/models/annotation";
import BlockTypes from "../src/models/block-type";
import HeadlineFinder from "../src/models/headline-finder";
import LineItem from "../src/models/line-item";
import LineItemBlock from "../src/models/line-item-block";
import Page from "../src/models/page";
import PageItem from "../src/models/page-item";
import ParseResult from "../src/models/parse-result";
import ParsedElements from "../src/models/parsed-elements";
import StashingStream from "../src/models/stashing-stream";
import TextItem from "../src/models/text-item";
import Word from "../src/models/word";
import { WordFormat, WordType } from "../src/models/line-converter";

describe("PageItem", () => {
  it("refuses direct construction", () => {
    expect(() => new (PageItem as any)({})).toThrow(TypeError);
  });

  it("defaults its optional fields to null through a subclass", () => {
    const item = new LineItem({});

    expect(item.type).toBeNull();
    expect(item.annotation).toBeNull();
    expect(item.parsedElements).toBeNull();
  });
});

describe("Word", () => {
  it("stores the string and defaults type and format to null", () => {
    const word = new Word({ string: "hello" });

    expect(word.string).toBe("hello");
    expect(word.type).toBeNull();
    expect(word.format).toBeNull();
  });

  it("keeps a supplied type and format", () => {
    const word = new Word({
      string: "hello",
      type: WordType.LINK,
      format: WordFormat.BOLD,
    });

    expect(word.type).toBe(WordType.LINK);
    expect(word.format).toBe(WordFormat.BOLD);
  });
});

describe("WordFormat / WordType", () => {
  it("wraps bold and italic spans", () => {
    expect(WordFormat.BOLD.startSymbol).toBe("<strong>");
    expect(WordFormat.OBLIQUE.endSymbol).toBe("</em>");
    expect(WordFormat.BOLD_OBLIQUE.startSymbol).toBe("<strong><em>");
  });

  it("renders links, footnote links and footnotes", () => {
    expect(WordType.LINK.toText("https://x.test")).toBe(
      '<a href="https://x.test">https://x.test</a>',
    );
    expect(WordType.FOOTNOTE_LINK.toText("3")).toBe('<sup><a href="#3">3</a></sup>');
    expect(WordType.FOOTNOTE.toText("3")).toBe('<p id="3">^3</p>');
  });
});

describe("LineItem", () => {
  it("defaults its geometry to zero", () => {
    const line = new LineItem({});

    expect([line.x, line.y, line.width, line.height]).toEqual([0, 0, 0, 0]);
    expect(line.words).toEqual([]);
  });

  it("splits a text option into words", () => {
    const line = new LineItem({ text: "one  two three" });

    expect(line.wordStrings()).toEqual(["one", "two", "three"]);
    expect(line.text()).toBe("one two three");
  });

  it("prefers an explicit words array over text", () => {
    const line = new LineItem({
      text: "ignored",
      words: [new Word({ string: "kept" })],
    });

    expect(line.text()).toBe("kept");
  });
});

describe("TextItem", () => {
  it("carries geometry, text, font and format markers", () => {
    const item = new TextItem({
      x: 1,
      y: 2,
      width: 3,
      height: 4,
      text: "hi",
      font: "Helvetica",
      lineFormat: WordFormat.BOLD,
    });

    expect(item.x).toBe(1);
    expect(item.text).toBe("hi");
    expect(item.font).toBe("Helvetica");
    expect(item.lineFormat).toBe(WordFormat.BOLD);
    expect(item.unopenedFormat).toBeNull();
    expect(item.unclosedFormat).toBeNull();
  });
});

describe("LineItemBlock", () => {
  it("starts empty", () => {
    expect(new LineItemBlock({}).items).toEqual([]);
  });

  it("adopts the type of the first typed item and strips it from the lines", () => {
    const block = new LineItemBlock({
      items: [new LineItem({ text: "a", type: BlockTypes.H1 })],
    });

    expect(block.type).toBe(BlockTypes.H1);
    expect(block.items[0].type).toBeNull();
  });

  it("rejects an item whose type conflicts with the block", () => {
    const block = new LineItemBlock({ type: BlockTypes.H1 });

    expect(() =>
      block.addItem(new LineItem({ text: "a", type: BlockTypes.PARAGRAPH })),
    ).toThrow(/Adding item of type PARAGRAPH to block of type H1/);
  });

  it("accepts untyped items into a typed block", () => {
    const block = new LineItemBlock({ type: BlockTypes.H1 });

    block.addItem(new LineItem({ text: "a" }));

    expect(block.items).toHaveLength(1);
  });

  it("adopts the first item's parsed elements", () => {
    const block = new LineItemBlock({
      items: [
        new LineItem({
          text: "a",
          parsedElements: new ParsedElements({ footnoteLinks: [1] }),
        }),
      ],
    });

    expect(block.parsedElements?.footnoteLinks).toEqual([1]);
  });

  it("merges parsed elements from later items", () => {
    const block = new LineItemBlock({
      items: [
        new LineItem({
          text: "a",
          parsedElements: new ParsedElements({ footnoteLinks: [1], formattedWords: 2 }),
        }),
        new LineItem({
          text: "b",
          parsedElements: new ParsedElements({ footnoteLinks: [2], containLinks: true }),
        }),
      ],
    });

    expect(block.parsedElements?.footnoteLinks).toEqual([1, 2]);
    expect(block.parsedElements?.containLinks).toBe(true);
    expect(block.parsedElements?.formattedWords).toBe(2);
  });
});

describe("ParsedElements", () => {
  it("defaults every field", () => {
    const parsed = new ParsedElements({});

    expect(parsed.footnoteLinks).toEqual([]);
    expect(parsed.footnotes).toEqual([]);
    expect(parsed.containLinks).toBe(false);
    expect(parsed.formattedWords).toBe(0);
  });

  it("accumulates another instance", () => {
    const parsed = new ParsedElements({ footnotes: ["a"], formattedWords: 1 });

    parsed.add(new ParsedElements({ footnotes: ["b"], formattedWords: 2, containLinks: true }));

    expect(parsed.footnotes).toEqual(["a", "b"]);
    expect(parsed.formattedWords).toBe(3);
    expect(parsed.containLinks).toBe(true);
  });
});

describe("Page and ParseResult", () => {
  it("defaults a page's items to an empty array", () => {
    expect(new Page({ index: 2 }).items).toEqual([]);
    expect(new Page({ index: 2 }).index).toBe(2);
  });

  it("defaults every ParseResult field", () => {
    const result = new ParseResult({});

    expect(result.pages).toEqual([]);
    expect(result.globals).toEqual({});
    expect(result.messages).toEqual([]);
  });

  it("keeps supplied pages, globals and messages", () => {
    const result = new ParseResult({
      pages: [new Page({ index: 0 })],
      globals: { mostUsedHeight: 12 },
      messages: ["done"],
    });

    expect(result.pages).toHaveLength(1);
    expect(result.globals.mostUsedHeight).toBe(12);
    expect(result.messages).toEqual(["done"]);
  });
});

describe("Annotation", () => {
  it("stores a category and colour", () => {
    const annotation = new Annotation({ category: "Custom", color: "blue" });

    expect(annotation.category).toBe("Custom");
    expect(annotation.color).toBe("blue");
  });

  it("exposes the pre-built singletons", () => {
    expect(ADDED_ANNOTATION.category).toBe("Added");
    expect(REMOVED_ANNOTATION.color).toBe("red");
    expect(UNCHANGED_ANNOTATION.category).toBe("Unchanged");
    expect(DETECTED_ANNOTATION.category).toBe("Detected");
    expect(MODIFIED_ANNOTATION.category).toBe("Modified");
  });
});

describe("HeadlineFinder", () => {
  it("returns the matching lines once the headline is complete", () => {
    const finder = new HeadlineFinder({ headline: "Chapter One" });

    const first = new LineItem({ text: "Chapter" });
    const second = new LineItem({ text: "One" });

    expect(finder.consume(first)).toBeNull();
    expect(finder.consume(second)).toEqual([first, second]);
  });

  it("matches a headline delivered on one line", () => {
    const finder = new HeadlineFinder({ headline: "Intro" });
    const line = new LineItem({ text: "Intro" });

    expect(finder.consume(line)).toEqual([line]);
  });

  it("ignores case, dots and spacing", () => {
    const finder = new HeadlineFinder({ headline: "1. Intro" });
    const line = new LineItem({ text: "1 intro" });

    expect(finder.consume(line)).toEqual([line]);
  });

  it("resets when the sequence breaks", () => {
    const finder = new HeadlineFinder({ headline: "Chapter One" });

    expect(finder.consume(new LineItem({ text: "Chapter" }))).toBeNull();
    expect(finder.consume(new LineItem({ text: "Nope" }))).toBeNull();
    expect(finder.consume(new LineItem({ text: "Chapter" }))).toBeNull();
    expect(finder.consume(new LineItem({ text: "One" }))?.length).toBe(2);
  });

  it("returns null for a line that never matches", () => {
    const finder = new HeadlineFinder({ headline: "Chapter One" });

    expect(finder.consume(new LineItem({ text: "Unrelated" }))).toBeNull();
  });
});

describe("StashingStream", () => {
  /** Buffers runs of equal numbers and flushes them as a summed total. */
  class SumRuns extends StashingStream {
    shouldStash(item: any): boolean {
      return typeof item === "number";
    }

    doMatchesStash(lastItem: any, item: any): boolean {
      return lastItem === item;
    }

    doFlushStash(stash: any[], results: any[]): void {
      results.push(stash.reduce((sum, value) => sum + value, 0));
    }
  }

  it("refuses direct construction", () => {
    expect(() => new (StashingStream as any)()).toThrow(TypeError);
  });

  it("throws for each abstract method left unimplemented", () => {
    class Bare extends StashingStream {}
    const stream = new Bare();

    expect(() => stream.shouldStash(1)).toThrow(TypeError);
    expect(() => stream.doMatchesStash(1, 2)).toThrow(TypeError);
    expect(() => stream.doFlushStash([], [])).toThrow(TypeError);
  });

  it("groups consecutive matching items", () => {
    const stream = new SumRuns();

    stream.consumeAll([1, 1, 1, 2, 2]);

    expect(stream.complete()).toEqual([3, 4]);
  });

  it("passes non-stashable items straight through", () => {
    const stream = new SumRuns();

    stream.consumeAll([1, 1, "x", 2]);

    expect(stream.complete()).toEqual([2, "x", 2]);
  });

  it("returns an empty result for no input", () => {
    expect(new SumRuns().complete()).toEqual([]);
  });

  it("calls the push hook for every stashed item", () => {
    const seen: any[] = [];
    class Hooked extends SumRuns {
      onPushOnStash(item: any): void {
        seen.push(item);
      }
    }

    const stream = new Hooked();
    stream.consumeAll([1, 1, 2]);
    stream.complete();

    expect(seen).toEqual([1, 1, 2]);
  });
});

describe("BlockTypes", () => {
  const block = (type: any, lines: string[]) =>
    new LineItemBlock({ type, items: lines.map((text) => new LineItem({ text })) });

  it("identifies headline types", () => {
    expect(BlockTypes.isHeadline(BlockTypes.H1)).toBe(true);
    expect(BlockTypes.isHeadline(BlockTypes.H6)).toBe(true);
    expect(BlockTypes.isHeadline(BlockTypes.PARAGRAPH)).toBe(false);
    expect(BlockTypes.isHeadline(null)).toBeFalsy();
  });

  it("maps levels 1-6 to the matching headline type", () => {
    expect(BlockTypes.headlineByLevel(1)).toBe(BlockTypes.H1);
    expect(BlockTypes.headlineByLevel(3)).toBe(BlockTypes.H3);
    expect(BlockTypes.headlineByLevel(6)).toBe(BlockTypes.H6);
  });

  it("clamps levels above 6 to H6", () => {
    expect(BlockTypes.headlineByLevel(9)).toBe(BlockTypes.H6);
  });

  it("looks a type up by name", () => {
    expect(BlockTypes.enumValueOf("PARAGRAPH")).toBe(BlockTypes.PARAGRAPH);
    expect(BlockTypes.enumValueOf("NOPE")).toBeUndefined();
  });

  it("renders each block type to its HTML tag", () => {
    expect(BlockTypes.blockToText(block(BlockTypes.H1, ["Title"]))).toContain("<h1>");
    expect(BlockTypes.blockToText(block(BlockTypes.H2, ["Title"]))).toContain("<h2>");
    expect(BlockTypes.blockToText(block(BlockTypes.H3, ["Title"]))).toContain("<h3>");
    expect(BlockTypes.blockToText(block(BlockTypes.H4, ["Title"]))).toContain("<h4>");
    expect(BlockTypes.blockToText(block(BlockTypes.H5, ["Title"]))).toContain("<h5>");
    expect(BlockTypes.blockToText(block(BlockTypes.H6, ["Title"]))).toContain("<h6>");
    expect(BlockTypes.blockToText(block(BlockTypes.PARAGRAPH, ["Body"]))).toContain("<p>");
    expect(BlockTypes.blockToText(block(BlockTypes.CODE, ["x = 1"]))).toContain("<code>");
    expect(BlockTypes.blockToText(block(BlockTypes.LIST, ["- item"]))).toContain("<ul>");
    expect(BlockTypes.blockToText(block(BlockTypes.FOOTNOTES, ["note"]))).toContain("<p>");
  });

  it("renders TOC blocks without a wrapping tag", () => {
    const text = BlockTypes.blockToText(block(BlockTypes.TOC, ["Chapter 1"]));

    expect(text).toContain("Chapter 1");
    expect(text).not.toContain("<p>");
  });

  it("renders an untyped block as plain lines", () => {
    const untyped = new LineItemBlock({ items: [new LineItem({ text: "plain" })] });

    expect(BlockTypes.blockToText(untyped)).toContain("plain");
  });

  it("carries the block content through to the rendered text", () => {
    expect(BlockTypes.blockToText(block(BlockTypes.PARAGRAPH, ["Hello", "world"]))).toContain(
      "Hello",
    );
  });
});
