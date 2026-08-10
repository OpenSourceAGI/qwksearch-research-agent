import { describe, expect, it } from "bun:test";
import { ADDED_ANNOTATION, REMOVED_ANNOTATION } from "../src/models/annotation";
import LineItem from "../src/models/line-item";
import Page from "../src/models/page";
import ParseResult from "../src/models/parse-result";
import TextItem from "../src/models/text-item";
import TextItemLineGrouper from "../src/models/text-item-line-grouper";
import VerticalToHorizontal from "../src/transforms/line-item/vertical-to-horizontal";

const resultWith = (items: any[]) =>
  new ParseResult({ pages: [new Page({ index: 0, items })] });

/** A run of one-character lines stacked bottom-up, as rotated sidebar text is extracted. */
function verticalRun(text: string, startY = 500, step = 10) {
  return [...text].map(
    (char, index) =>
      new LineItem({ x: 20, y: startY - index * step, width: 5, height: 8, text: char }),
  );
}

describe("VerticalToHorizontal", () => {
  it("merges a run of six or more single-character lines", () => {
    const result = new VerticalToHorizontal().transform(resultWith(verticalRun("SIDEBAR")));
    const items = result.pages[0].items;

    expect(result.messages[0]).toBe("Converted 1 verticals");
    expect(items.filter((item: any) => item.annotation === REMOVED_ANNOTATION)).toHaveLength(7);

    const merged = items.find((item: any) => item.annotation === ADDED_ANNOTATION);
    expect(merged.wordStrings().join("")).toBe("SIDEBAR");
  });

  it("gives the merged line the run's bounding box", () => {
    const result = new VerticalToHorizontal().transform(resultWith(verticalRun("ABCDEF")));
    const merged = result.pages[0].items.find(
      (item: any) => item.annotation === ADDED_ANNOTATION,
    );

    expect(merged.x).toBe(20);
    expect(merged.y).toBe(500);
    expect(merged.width).toBe(6 * 5);
    expect(merged.height).toBe(8);
  });

  it("leaves a run of five or fewer characters as separate lines", () => {
    const result = new VerticalToHorizontal().transform(resultWith(verticalRun("ABCDE")));

    expect(result.messages[0]).toBe("Converted 0 verticals");
    expect(result.pages[0].items).toHaveLength(5);
    expect(result.pages[0].items[0].annotation).toBeNull();
  });

  it("passes multi-character lines straight through", () => {
    const result = new VerticalToHorizontal().transform(
      resultWith([new LineItem({ x: 0, y: 100, text: "normal line" })]),
    );

    expect(result.pages[0].items).toHaveLength(1);
    expect(result.pages[0].items[0].text()).toBe("normal line");
  });

  it("breaks the run when the vertical gap is too small", () => {
    const tight = [...verticalRun("ABC"), ...verticalRun("DEF", 400, 1)];

    const result = new VerticalToHorizontal().transform(resultWith(tight));

    expect(result.messages[0]).toBe("Converted 0 verticals");
  });

  it("interleaves merged runs with surrounding prose", () => {
    const result = new VerticalToHorizontal().transform(
      resultWith([
        new LineItem({ x: 0, y: 600, text: "before" }),
        ...verticalRun("SIDEBAR"),
        new LineItem({ x: 0, y: 100, text: "after" }),
      ]),
    );
    const items = result.pages[0].items;

    expect(items[0].text()).toBe("before");
    expect(items[items.length - 1].text()).toBe("after");
  });

  it("handles an empty page", () => {
    const result = new VerticalToHorizontal().transform(resultWith([]));

    expect(result.pages[0].items).toEqual([]);
    expect(result.messages[0]).toBe("Converted 0 verticals");
  });
});

describe("TextItemLineGrouper", () => {
  const item = (x: number, y: number, text = "x") =>
    new TextItem({ x, y, width: 10, height: 10, text, font: "f" });

  it("defaults the distance threshold to 12", () => {
    expect(new TextItemLineGrouper({}).mostUsedDistance).toBe(12);
  });

  it("groups items on the same y into one line", () => {
    const lines = new TextItemLineGrouper({ mostUsedDistance: 12 }).group([
      item(10, 100, "a"),
      item(30, 100, "b"),
    ]);

    expect(lines).toHaveLength(1);
    expect(lines[0].map((i) => i.text)).toEqual(["a", "b"]);
  });

  it("starts a new line when y moves by half the distance or more", () => {
    const lines = new TextItemLineGrouper({ mostUsedDistance: 12 }).group([
      item(10, 100, "a"),
      item(10, 80, "b"),
    ]);

    expect(lines).toHaveLength(2);
  });

  it("keeps near-identical y values on one line", () => {
    const lines = new TextItemLineGrouper({ mostUsedDistance: 12 }).group([
      item(10, 100, "a"),
      item(30, 98, "b"),
    ]);

    expect(lines).toHaveLength(1);
  });

  it("sorts each line left to right", () => {
    const lines = new TextItemLineGrouper({ mostUsedDistance: 12 }).group([
      item(50, 100, "c"),
      item(10, 100, "a"),
      item(30, 100, "b"),
    ]);

    expect(lines[0].map((i) => i.text)).toEqual(["a", "b", "c"]);
  });

  it("returns a single empty line for no items", () => {
    expect(new TextItemLineGrouper({}).group([])).toEqual([[]]);
  });
});
