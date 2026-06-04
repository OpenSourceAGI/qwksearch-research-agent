/**
 * @description Enum-like registry of semantic document block types (H1–H6, TOC,
 * FOOTNOTES, CODE, LIST, PARAGRAPH). Each entry carries a `toText()` serializer
 * that converts a `LineItemBlock` to HTML. Helper methods `isHeadline`,
 * `blockToText`, and `headlineByLevel` are mixed in on the registry object.
 * The inner `linesToText` function handles inline bold/italic/link/footnote
 * formatting by tracking open `WordFormat` spans across words and lines.
 */

const BlockTypes: Record<string, any> = {
  H1: {
    name: "H1",
    headline: true,
    headlineLevel: 1,
    toText(block /*: LineItemBlock */) /*: string */ {
      return "<h1>" + linesToText(block.items, true) + "</h1>";
    },
  },
  H2: {
    name: "H2",
    headline: true,
    headlineLevel: 2,
    toText(block /*: LineItemBlock */) /*: string */ {
      return "<h2>" + linesToText(block.items, true) + "</h2>";
    },
  },
  H3: {
    name: "H3",
    headline: true,
    headlineLevel: 3,
    toText(block /*: LineItemBlock */) /*: string */ {
      return "<h3>" + linesToText(block.items, true) + "</h3>";
    },
  },
  H4: {
    name: "H4",
    headline: true,
    headlineLevel: 4,
    toText(block /*: LineItemBlock */) /*: string */ {
      return "<h4>" + linesToText(block.items, true) + "</h4>";
    },
  },
  H5: {
    name: "H5",
    headline: true,
    headlineLevel: 5,
    toText(block /*: LineItemBlock */) /*: string */ {
      return "<h5>" + linesToText(block.items, true) + "</h5>";
    },
  },
  H6: {
    name: "H6",
    headline: true,
    headlineLevel: 6,
    toText(block /*: LineItemBlock */) /*: string */ {
      return "<h6>" + linesToText(block.items, true) + "</h6>";
    },
  },
  TOC: {
    name: "TOC",
    mergeToBlock: true,
    toText(block /*: LineItemBlock */) /*: string */ {
      return linesToText(block.items, true);
    },
  },
  FOOTNOTES: {
    name: "FOOTNOTES",
    mergeToBlock: true,
    mergeFollowingNonTypedItems: true,
    toText(block /*: LineItemBlock */) /*: string */ {
      return "<p>" + linesToText(block.items, false) + "</p>";
    },
  },
  CODE: {
    name: "CODE",
    mergeToBlock: true,
    toText(block /*: LineItemBlock */) /*: string */ {
      return "<code>" + linesToText(block.items, true) + "</code>";
    },
  },
  LIST: {
    name: "LIST",
    mergeToBlock: false,
    mergeFollowingNonTypedItemsWithSmallDistance: true,
    toText(block /*: LineItemBlock */) /*: string */ {
      return "<ul>\n" + linesToText(block.items, false) + "</ul>";
    },
  },
  PARAGRAPH: {
    name: "PARAGRAPH",
    toText(block /*: LineItemBlock */) /*: string */ {
      return "<p>" + linesToText(block.items, false) + "</p>";
    },
  },
};

function firstFormat(lineItem: { words: Array<{ format: any }> }): any {
  if (lineItem.words.length === 0) {
    return null;
  }
  return lineItem.words[0].format;
}

function isPunctationCharacter(string: string): boolean {
  if (string.length !== 1) {
    return false;
  }
  return string[0] === "." || string[0] === "!" || string[0] === "?";
}

function linesToText(lineItems: any[], disableInlineFormats: boolean): string {
  var text = "";
  var openFormat;

  const closeFormat = () => {
    text += openFormat.endSymbol;
    openFormat = null;
  };

  lineItems.forEach((line, lineIndex) => {
    if (!line) return;

    line.words.forEach((word, i) => {
      const wordType = word.type;
      const wordFormat = word.format;
      if (openFormat && (!wordFormat || wordFormat !== openFormat)) {
        closeFormat();
      }

      if (
        i > 0 &&
        !(wordType && wordType.attachWithoutWhitespace) &&
        !isPunctationCharacter(word.string)
      ) {
        text += " ";
      }

      if (wordFormat && !openFormat && !disableInlineFormats) {
        openFormat = wordFormat;
        text += openFormat.startSymbol;
      }

      if (wordType && (!disableInlineFormats || wordType.plainTextFormat)) {
        text += wordType.toText(word.string);
      } else {
        text += word.string;
      }
    });
    if (
      openFormat &&
      (lineIndex === lineItems.length - 1 ||
        firstFormat(lineItems[lineIndex + 1]) !== openFormat)
    ) {
      closeFormat();
    }
    text += "\n";
  });
  return text;
}

// Make the object immutable
// Object.freeze(BlockTypes);
// Object.values(BlockTypes).forEach(value => Object.freeze(value));

BlockTypes.enumValueOf = function enumValueOf(name: string) {
  return BlockTypes[name];
};

BlockTypes.isHeadline = function isHeadline(
  type /*: typeof BlockTypes[keyof typeof BlockTypes] */,
) /*: boolean */ {
  return type && type.name.length === 2 && type.name[0] === "H";
};

BlockTypes.blockToText = function blockToText(
  block /*: LineItemBlock */,
) /*: string */ {
  if (!block.type) {
    return linesToText(block.items, false);
  }
  return block.type.toText(block);
};

BlockTypes.headlineByLevel = function headlineByLevel(level) {
  if (level === 1) return BlockTypes.H1;
  if (level === 2) return BlockTypes.H2;
  if (level === 3) return BlockTypes.H3;
  if (level === 4) return BlockTypes.H4;
  if (level === 5) return BlockTypes.H5;

  // if level is >= 6, just use BlockType H6
  if (level > 6) {
    // eslint-disable-next-line no-console
    console.warn(
      "Unsupported headline level: " +
        level +
        " (supported are 1-6), defaulting to level 6",
    );
  }
  return BlockTypes.H6;
};

export default BlockTypes;
