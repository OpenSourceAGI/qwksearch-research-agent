import { describe, expect, it } from "bun:test";
import LineItem from "../src/models/line-item";
import LineItemBlock from "../src/models/line-item-block";
import {
  minXFromBlocks,
  minXFromPageItems,
  sortByX,
} from "../src/utils/page-item-functions";
import {
  findFirstPage,
  findPageNumbers,
  removePageNumber,
} from "../src/utils/page-number-functions";

describe("minXFromBlocks", () => {
  it("finds the smallest x across every line in every block", () => {
    const blocks = [
      new LineItemBlock({ items: [new LineItem({ x: 50 }), new LineItem({ x: 30 })] }),
      new LineItemBlock({ items: [new LineItem({ x: 40 })] }),
    ];

    expect(minXFromBlocks(blocks)).toBe(30);
  });

  it("returns null for no blocks", () => {
    expect(minXFromBlocks([])).toBeNull();
  });

  it("returns null when every block is empty", () => {
    expect(minXFromBlocks([new LineItemBlock({})])).toBeNull();
  });
});

describe("minXFromPageItems", () => {
  it("finds the smallest x", () => {
    expect(minXFromPageItems([{ x: 12 }, { x: 4 }, { x: 80 }])).toBe(4);
  });

  it("returns null for an empty list", () => {
    expect(minXFromPageItems([])).toBeNull();
  });
});

describe("sortByX", () => {
  it("sorts items left to right in place", () => {
    const items = [{ x: 30 }, { x: 10 }, { x: 20 }];

    sortByX(items);

    expect(items.map((item) => item.x)).toEqual([10, 20, 30]);
  });
});

/** Builds a page's text content with `count` filler items and extras spliced in. */
function pageItems(count: number, top: string[] = [], bottom: string[] = []) {
  const filler = Array.from({ length: count }, (_, i) => ({ str: `body ${i}` }));
  return [
    ...top.map((str) => ({ str })),
    ...filler,
    ...bottom.map((str) => ({ str })),
  ];
}

describe("findPageNumbers", () => {
  it("collects numeric items from the top and bottom of a page", () => {
    const map = findPageNumbers({}, 0, pageItems(20, ["7"], ["7"]));

    expect(map[0]).toContain(7);
  });

  it("ignores pages with no numeric items", () => {
    expect(findPageNumbers({}, 0, pageItems(20))).toEqual({});
  });

  it("trims whitespace before testing for a number", () => {
    const map = findPageNumbers({}, 3, pageItems(20, ["  12  "]));

    expect(map[3]).toContain(12);
  });

  it("accumulates across pages into the same map", () => {
    let map = findPageNumbers({}, 0, pageItems(20, ["1"]));
    map = findPageNumbers(map, 1, pageItems(20, ["2"]));

    expect(Object.keys(map)).toEqual(["0", "1"]);
  });
});

describe("findFirstPage", () => {
  it("returns undefined for fewer than two pages", () => {
    expect(findFirstPage({})).toBeUndefined();
    expect(findFirstPage({ 0: [1] })).toBeUndefined();
  });

  it("finds the page where consecutive numbering starts", () => {
    const result = findFirstPage({ 0: [1], 1: [2], 2: [3] });

    expect(result).toEqual({ pageIndex: 0, pageNum: 1 });
  });

  it("returns undefined when the numbers never run consecutively", () => {
    expect(findFirstPage({ 0: [9], 1: [4], 2: [77] })).toBeUndefined();
  });

  it("tolerates gaps between numbered pages", () => {
    const result = findFirstPage({ 0: [1], 2: [3], 4: [5] });

    expect(result).toBeDefined();
    expect(result?.pageNum).toBe(1);
  });
});

describe("removePageNumber", () => {
  it("drops a matching number from the top and bottom areas", () => {
    const content = { items: pageItems(20, ["x", "7"], ["7"]) };

    const filtered = removePageNumber(content, 7);

    expect(filtered.items.some((item) => item.str === "7")).toBe(false);
  });

  it("keeps a number that is not the page number", () => {
    const content = { items: pageItems(20, ["x", "42"]) };

    const filtered = removePageNumber(content, 7);

    expect(filtered.items.some((item) => item.str === "42")).toBe(true);
  });

  it("keeps body text untouched", () => {
    const content = { items: pageItems(20, ["x", "7"]) };

    const filtered = removePageNumber(content, 7);

    expect(filtered.items.some((item) => item.str === "body 0")).toBe(true);
  });

  it("does not mutate the input content", () => {
    const items = pageItems(20, ["x", "7"]);
    const content = { items };

    removePageNumber(content, 7);

    expect(content.items).toBe(items);
    expect(items.some((item) => item.str === "7")).toBe(true);
  });
});
