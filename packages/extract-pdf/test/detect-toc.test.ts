import { describe, expect, test } from "bun:test";
import DetectTOC from "../src/transforms/line-item/detect-toc";
import ParseResult from "../src/models/parse-result";
import Page from "../src/models/page";
import LineItem from "../src/models/line-item";
import Word from "../src/models/word";
import BlockType from "../src/models/block-type";

function line(parts: string[], x = 0, height = 10): LineItem {
  return new LineItem({ x, height, words: parts.map((string) => new Word({ string })) });
}

describe("DetectTOC", () => {
  test("detects a dotted-leader table of contents and links headings", () => {
    const toc = new Page({
      index: 0,
      items: [
        line(["Contents"]),
        line(["Introduction", "....", "1"]),
        line(["Methods", "....", "2"]),
        line(["Results", "....", "3"]),
        line(["Summary", "....", "3"]),
      ],
    });
    const p1 = new Page({ index: 1, items: [line(["Introduction"], 0, 20), line(["body"])] });
    const p2 = new Page({ index: 2, items: [line(["Methods"], 0, 20), line(["body"])] });
    const p3 = new Page({ index: 3, items: [line(["Results"], 0, 20), line(["body"])] });
    const result = new DetectTOC().transform(
      new ParseResult({ pages: [toc, p1, p2, p3] }),
    );

    expect(result.globals.tocPages).toEqual([1]);
    expect(result.messages[0]).toBe("Detected 1 table of content pages");
    const tocItems = toc.items.filter((i) => i.type === BlockType.TOC);
    expect(tocItems).toHaveLength(4);
    const headings = [p1, p2, p3].map((p) =>
      p.items.some((i) => i.type === BlockType.H2),
    );
    expect(headings).toEqual([true, true, true]);
  });

  test("ignores pages without dotted leaders", () => {
    const page = new Page({ index: 0, items: [line(["Chapter", "1"]), line(["text"])] });
    const result = new DetectTOC().transform(new ParseResult({ pages: [page] }));
    expect(result.globals.tocPages).toEqual([]);
    expect(result.messages).toEqual(["Detected 0 table of content pages"]);
  });
});
