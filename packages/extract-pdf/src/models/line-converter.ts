/**
 * @description Converts an array of spatially-grouped TextItems (one line) into a single
 * LineItem by detecting inline formatting (bold, italic), footnote superscripts, footnote
 * anchors, and hyperlinks. WordFormat carries HTML open/close symbols; WordType carries
 * rendering helpers for links and footnotes. The inner WordDetectionStream extends
 * StashingStream to buffer consecutive same-format items before flushing them as Word nodes.
 */
import TextItem from "./text-item";
import Word, { WordFormatEntry, WordTypeEntry } from "./word";
import LineItem from "./line-item";
import StashingStream from "./stashing-stream";
import ParsedElements from "./parsed-elements";
import { isNumber, isListItemCharacter } from "../utils/string-functions";
import { sortByX } from "../utils/page-item-functions";

export const WordFormat: Record<string, WordFormatEntry> = {
  BOLD: {
    name: "BOLD",
    startSymbol: "<strong>",
    endSymbol: "</strong>",
  },

  OBLIQUE: {
    name: "OBLIQUE",
    startSymbol: "<em>",
    endSymbol: "</em>",
  },

  BOLD_OBLIQUE: {
    name: "BOLD_OBLIQUE",
    startSymbol: "<strong><em>",
    endSymbol: "</em></strong>",
  },
};

export const WordType: Record<string, WordTypeEntry> = {
  LINK: {
    name: "LINK",
    toText(string: string) {
      return `<a href="${string}">${string}</a>`;
    },
  },

  FOOTNOTE_LINK: {
    name: "FOOTNOTE_LINK",
    attachWithoutWhitespace: true,
    plainTextFormat: true,
    toText(string: string) {
      return `<sup><a href="#${string}">${string}</a></sup>`;
    },
  },

  FOOTNOTE: {
    name: "FOOTNOTE",
    toText(string: string) {
      return `<p id="${string}">^${string}</p>`;
    },
  },
};

export default class LineConverter {
  fontToFormats: Map<string, string>;

  constructor(fontToFormats: Map<string, string>) {
    this.fontToFormats = fontToFormats;
  }

  compact(textItems: TextItem[]): LineItem {
    sortByX(textItems);

    const wordStream = new WordDetectionStream(this.fontToFormats);
    wordStream.consumeAll(textItems.map((item) => new TextItem({ ...item })));
    const words = wordStream.complete();

    var maxHeight = 0;
    var widthSum = 0;
    textItems.forEach((item) => {
      maxHeight = Math.max(maxHeight, item.height);
      widthSum += item.width;
    });
    return new LineItem({
      x: textItems[0].x,
      y: textItems[0].y,
      height: maxHeight,
      width: widthSum,
      words: words,
      parsedElements: new ParsedElements({
        footnoteLinks: wordStream.footnoteLinks,
        footnotes: wordStream.footnotes,
        containLinks: wordStream.containLinks,
        formattedWords: wordStream.formattedWords,
      }),
    });
  }
}

class WordDetectionStream extends StashingStream {
  fontToFormats: Map<string, string>;
  footnoteLinks: number[];
  footnotes: string[];
  formattedWords: number;
  containLinks: boolean;
  stashedNumber: boolean;
  firstY?: number;
  currentItem: TextItem | null;

  constructor(fontToFormats: Map<string, string>) {
    super();
    this.fontToFormats = fontToFormats;
    this.footnoteLinks = [];
    this.footnotes = [];
    this.formattedWords = 0;
    this.containLinks = false;
    this.stashedNumber = false;
    this.currentItem = null;
  }

  shouldStash(item: any): boolean {
    if (!this.firstY) {
      this.firstY = item.y;
    }
    this.currentItem = item;
    return true;
  }

  onPushOnStash(item: any): void {
    this.stashedNumber = isNumber(item.text.trim());
  }

  doMatchesStash(lastItem: any, item: any): boolean {
    const lastItemFormat = this.fontToFormats.get(lastItem.font);
    const itemFormat = this.fontToFormats.get(item.font);
    if (lastItemFormat !== itemFormat) {
      return false;
    }
    const itemIsANumber = isNumber(item.text.trim());
    return this.stashedNumber === itemIsANumber;
  }

  doFlushStash(stash: any[], results: any[]): void {
    if (this.stashedNumber) {
      const joinedNumber = stash
        .map((item: any) => item.text)
        .join("")
        .trim();
      if (stash[0].y > this.firstY) {
        results.push(
          new Word({
            string: `${joinedNumber}`,
            type: WordType.FOOTNOTE_LINK,
          }),
        );
        this.footnoteLinks.push(parseInt(joinedNumber));
      } else if (this.currentItem && this.currentItem.y < stash[0].y) {
        results.push(
          new Word({
            string: `${joinedNumber}`,
            type: WordType.FOOTNOTE,
          }),
        );
        this.footnotes.push(joinedNumber);
      } else {
        this.copyStashItemsAsText(stash, results);
      }
    } else {
      this.copyStashItemsAsText(stash, results);
    }
  }

  copyStashItemsAsText(stash: any[], results: any[]): void {
    const format = this.fontToFormats.get(stash[0].font);
    results.push(...this.itemsToWords(stash, format));
  }

  itemsToWords(items: TextItem[], formatName: string | null): Word[] {
    const combinedText = combineText(items);
    const words = combinedText.split(" ");
    const format = formatName ? WordFormat[formatName] : null;
    return words
      .filter((w) => w.trim().length > 0)
      .map((word) => {
        var type: WordTypeEntry | null = null;
        if (word.startsWith("http:")) {
          this.containLinks = true;
          type = WordType.LINK;
        } else if (word.startsWith("www.")) {
          this.containLinks = true;
          word = `http://${word}`;
          type = WordType.LINK;
        }

        if (format) {
          this.formattedWords++;
        }
        return new Word({ string: word, type, format });
      });
  }
}

function combineText(textItems: TextItem[]): string {
  var text = "";
  var lastItem: TextItem | null = null;
  textItems.forEach((textItem) => {
    var textToAdd = textItem.text;
    if (!text.endsWith(" ") && !textToAdd.startsWith(" ")) {
      if (lastItem) {
        const xDistance = textItem.x - lastItem.x - lastItem.width;
        if (xDistance > 5) {
          text += " ";
        }
      } else {
        if (isListItemCharacter(textItem.text)) {
          textToAdd += " ";
        }
      }
    }
    text += textToAdd;
    lastItem = textItem;
  });
  return text;
}



