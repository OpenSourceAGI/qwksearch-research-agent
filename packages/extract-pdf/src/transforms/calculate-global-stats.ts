/**
 * @description First-pass transformation that scans all `TextItem`s to compute
 * document-wide statistics stored in `parseResult.globals`: most-frequent text
 * height (`mostUsedHeight`), most-frequent font, most-frequent line distance,
 * maximum height, and a font-to-format map (BOLD/OBLIQUE/BOLD_OBLIQUE) derived
 * from font names. Also deep-copies every page item so subsequent transforms
 * never mutate the original parsed data.
 */
import ToTextItemTransformation from "./base/to-text-item-transform";
import ParseResult from "../models/parse-result";
import { WordFormat } from "../models/line-converter";

export default class CalculateGlobalStats extends ToTextItemTransformation {
  fontMap: Map<string, { name: string }> | undefined;

  constructor(fontMap?: Map<string, { name: string }>) {
    super("Calculate Global Stats");
    this.fontMap = fontMap;
  }

  transform(parseResult: ParseResult): ParseResult {
    const heightToOccurrence: Record<string, number> = {};
    const fontToOccurrence: Record<string, number> = {};
    var maxHeight = 0;
    var maxHeightFont: string | undefined;
    parseResult.pages.forEach((page) => {
      page.items.forEach((item) => {
        if (!item.height) return;
        heightToOccurrence[item.height] = heightToOccurrence[item.height]
          ? heightToOccurrence[item.height] + 1
          : 1;
        fontToOccurrence[item.font] = fontToOccurrence[item.font]
          ? fontToOccurrence[item.font] + 1
          : 1;
        if (item.height > maxHeight) {
          maxHeight = item.height;
          maxHeightFont = item.font;
        }
      });
    });
    const mostUsedHeight = parseInt(getMostUsedKey(heightToOccurrence));
    const mostUsedFont = getMostUsedKey(fontToOccurrence);

    const distanceToOccurrence: Record<string, number> = {};
    parseResult.pages.forEach((page) => {
      var lastItemOfMostUsedHeight: any;
      page.items.forEach((item) => {
        if (item.height === mostUsedHeight && item.text.trim().length > 0) {
          if (
            lastItemOfMostUsedHeight &&
            item.y !== lastItemOfMostUsedHeight.y
          ) {
            const distance = lastItemOfMostUsedHeight.y - item.y;
            if (distance > 0) {
              distanceToOccurrence[distance] = distanceToOccurrence[distance]
                ? distanceToOccurrence[distance] + 1
                : 1;
            }
          }
          lastItemOfMostUsedHeight = item;
        } else {
          lastItemOfMostUsedHeight = null;
        }
      });
    });
    const mostUsedDistance = parseInt(getMostUsedKey(distanceToOccurrence));
    const fontIdToName: string[] = [];
    const fontToFormats = new Map<string, string>();
    this.fontMap?.forEach(function (value, key) {
      fontIdToName.push(key + " = " + value.name);
      const fontName = value.name.toLowerCase();
      var format: { name: string } | null = null;
      if (key === mostUsedFont) {
        format = null;
      } else if (
        fontName.includes("bold") &&
        (fontName.includes("oblique") || fontName.includes("italic"))
      ) {
        format = WordFormat.BOLD_OBLIQUE;
      } else if (fontName.includes("bold")) {
        format = WordFormat.BOLD;
      } else if (fontName.includes("oblique") || fontName.includes("italic")) {
        format = WordFormat.OBLIQUE;
      } else if (fontName === maxHeightFont) {
        format = WordFormat.BOLD;
      }
      if (format) {
        fontToFormats.set(key, format.name);
      }
    });
    fontIdToName.sort();

    const newPages = parseResult.pages.map((page) => {
      return {
        ...page,
        items: page.items.map((textItem) => ({ ...textItem })),
      };
    });
    return new ParseResult({
      ...parseResult,
      pages: newPages,
      globals: {
        mostUsedHeight,
        mostUsedFont,
        mostUsedDistance,
        maxHeight,
        maxHeightFont,
        fontToFormats,
      },
      messages: [
        "Items per height: " + JSON.stringify(heightToOccurrence),
        "Items per font: " + JSON.stringify(fontToOccurrence),
        "Items per distance: " + JSON.stringify(distanceToOccurrence),
        "Fonts:" + JSON.stringify(fontIdToName),
      ],
    });
  }
}

function getMostUsedKey(keyToOccurrence: Record<string, number>): string {
  var maxOccurence = 0;
  var maxKey = "";
  Object.keys(keyToOccurrence).map((element) => {
    if (!maxKey || keyToOccurrence[element] > maxOccurence) {
      maxOccurence = keyToOccurrence[element];
      maxKey = element;
    }
  });
  return maxKey;
}


