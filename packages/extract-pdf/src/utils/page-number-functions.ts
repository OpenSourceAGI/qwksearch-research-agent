/**
 * @description Detects and strips printed page numbers from PDF text content.
 * Scans the top and bottom sixths of each page's item list for standalone numeric
 * strings, builds a `pageIndex → pageNum` map, finds the first page where numbers
 * begin incrementing consecutively, and provides `removePageNumber` to filter
 * those items out before further processing.
 */
import {
  removeLeadingWhitespaces,
  removeTrailingWhitespaces,
  isNumber,
} from "./string-functions";

interface TextContentItem {
  str: string;
}

interface TextContent {
  items: TextContentItem[];
}

type PageIndexNumMap = Record<string, number[]>;

const searchRange = (numerator: number, denominator: number, length: number): number => {
  return Math.floor((numerator / denominator) * length);
};

const searchArea = (range: TextContentItem[], pageIndexNumMap: PageIndexNumMap, pageIndex: number): PageIndexNumMap => {
  for (const { str } of range) {
    const trimLeadingWhitespaces = removeLeadingWhitespaces(str);
    const trimWhitespaces = removeTrailingWhitespaces(trimLeadingWhitespaces);
    if (isNumber(trimWhitespaces)) {
      if (!pageIndexNumMap[pageIndex]) {
        pageIndexNumMap[pageIndex] = [];
      }
      pageIndexNumMap[pageIndex].push(Number(trimWhitespaces));
    }
  }
  return pageIndexNumMap;
};

const findPageNumbers = (pageIndexNumMap: PageIndexNumMap, pageIndex: number, items: TextContentItem[]): PageIndexNumMap => {
  const topArea = searchRange(1, 6, items.length);
  const bottomArea = searchRange(5, 6, items.length);

  const topAreaResult = searchArea(
    items.slice(0, topArea),
    pageIndexNumMap,
    pageIndex,
  );
  return searchArea(items.slice(bottomArea), topAreaResult, pageIndex);
};

const findFirstPage = (pageIndexNumMap: PageIndexNumMap): { pageIndex: number; pageNum: number } | undefined => {
  let counter = 0;
  const keys = Object.keys(pageIndexNumMap);
  if (keys.length === 0 || keys.length === 1) {
    return;
  }

  for (let x = 0; x < keys.length - 1; x++) {
    const firstPage = pageIndexNumMap[keys[x]];
    const secondPage = pageIndexNumMap[keys[x + 1]];
    const prevCounter = counter;

    for (let y = 0; y < firstPage.length && counter < 2; y++) {
      for (let z = 0; z < secondPage.length && counter < 2; z++) {
        const pageDifference = Number(keys[x + 1]) - Number(keys[x]);
        if (firstPage[y] + 1 === secondPage[z]) {
          counter++;
        } else if (
          pageDifference > 1 &&
          firstPage[y] + pageDifference === secondPage[z]
        ) {
          counter++;
        }
      }
    }

    let pageDetails =
      x > 0
        ? Object.entries(pageIndexNumMap)[x - 1]
        : Object.entries(pageIndexNumMap)[x];
    if (prevCounter === counter) {
      counter = 0;
      pageDetails = Object.entries(pageIndexNumMap)[x];
    } else if (counter >= 2) {
      return { pageIndex: Number(pageDetails[0]), pageNum: pageDetails[1][0] };
    }
  }
};

const removePageNumber = (textContent: TextContent, pageNum: number): TextContent => {
  const filteredContent = { items: [...textContent.items] };
  const topArea = searchRange(1, 6, filteredContent.items.length);
  const bottomArea = searchRange(5, 6, filteredContent.items.length);

  filteredContent.items = filteredContent.items.filter((item, index) => {
    const isAtTop = index > 0 && index < topArea;
    const isAtBottom =
      index > bottomArea && index < filteredContent.items.length;

    return isAtTop || isAtBottom ? Number(item.str) !== Number(pageNum) : item;
  });
  return filteredContent;
};

export { findPageNumbers, findFirstPage, removePageNumber };

