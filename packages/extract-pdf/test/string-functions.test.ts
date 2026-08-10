import { describe, expect, it } from "bun:test";
import {
  charCodeArray,
  escapeHtml,
  hasOnly,
  hasUpperCaseCharacterInMiddleOfWord,
  isDigit,
  isListItem,
  isListItemCharacter,
  isNumber,
  isNumberedListItem,
  normalizedCharCodeArray,
  prefixAfterWhitespace,
  removeLeadingWhitespaces,
  removeTrailingWhitespaces,
  suffixBeforeWhitespace,
  wordMatch,
} from "../src/utils/string-functions";

describe("whitespace trimming", () => {
  it("removes leading spaces only", () => {
    expect(removeLeadingWhitespaces("   text  ")).toBe("text  ");
  });

  it("removes trailing spaces only", () => {
    expect(removeTrailingWhitespaces("  text   ")).toBe("  text");
  });

  it("leaves untrimmed strings alone", () => {
    expect(removeLeadingWhitespaces("text")).toBe("text");
    expect(removeTrailingWhitespaces("text")).toBe("text");
  });

  it("handles the empty string", () => {
    expect(removeLeadingWhitespaces("")).toBe("");
    expect(removeTrailingWhitespaces("")).toBe("");
  });
});

describe("isDigit", () => {
  it("accepts the digit char codes", () => {
    expect(isDigit("0".charCodeAt(0))).toBe(true);
    expect(isDigit("9".charCodeAt(0))).toBe(true);
  });

  it("rejects anything else", () => {
    expect(isDigit("a".charCodeAt(0))).toBe(false);
    expect(isDigit("/".charCodeAt(0))).toBe(false);
    expect(isDigit(":".charCodeAt(0))).toBe(false);
  });
});

describe("isNumber", () => {
  it("accepts an all-digit string", () => {
    expect(isNumber("12345")).toBe(true);
  });

  it("rejects a string with any non-digit", () => {
    expect(isNumber("12a45")).toBe(false);
    expect(isNumber("12.45")).toBe(false);
    expect(isNumber(" 12")).toBe(false);
  });

  it("treats the empty string as a number", () => {
    expect(isNumber("")).toBe(true);
  });
});

describe("hasOnly", () => {
  it("accepts a string of one repeated character", () => {
    expect(hasOnly("....", ".")).toBe(true);
  });

  it("rejects a mixed string", () => {
    expect(hasOnly("..a.", ".")).toBe(false);
  });
});

describe("hasUpperCaseCharacterInMiddleOfWord", () => {
  it("detects camel case", () => {
    expect(hasUpperCaseCharacterInMiddleOfWord("camelCase")).toBe(true);
    expect(hasUpperCaseCharacterInMiddleOfWord("some camelCase text")).toBe(true);
  });

  it("ignores capitals at the start of a word", () => {
    expect(hasUpperCaseCharacterInMiddleOfWord("Title Case Words")).toBe(false);
  });

  it("ignores digits and punctuation mid-word", () => {
    expect(hasUpperCaseCharacterInMiddleOfWord("abc123")).toBe(false);
    expect(hasUpperCaseCharacterInMiddleOfWord("a-b-c")).toBe(false);
  });

  it("handles the empty string", () => {
    expect(hasUpperCaseCharacterInMiddleOfWord("")).toBe(false);
  });
});

describe("charCodeArray / normalizedCharCodeArray", () => {
  it("maps each character to its code", () => {
    expect(charCodeArray("AB")).toEqual([65, 66]);
    expect(charCodeArray("")).toEqual([]);
  });

  it("uppercases and drops spaces, tabs and dots", () => {
    expect(normalizedCharCodeArray("a b.\tc")).toEqual(
      charCodeArray("ABC"),
    );
  });
});

describe("prefixAfterWhitespace / suffixBeforeWhitespace", () => {
  it("moves a prefix past leading whitespace", () => {
    expect(prefixAfterWhitespace("<b>", "  word")).toBe(" <b>word");
  });

  it("prepends directly when there is no leading whitespace", () => {
    expect(prefixAfterWhitespace("<b>", "word")).toBe("<b>word");
  });

  it("moves a suffix before trailing whitespace", () => {
    expect(suffixBeforeWhitespace("word  ", "</b>")).toBe("word</b> ");
  });

  it("appends directly when there is no trailing whitespace", () => {
    expect(suffixBeforeWhitespace("word", "</b>")).toBe("word</b>");
  });
});

describe("list item detection", () => {
  it("recognises single bullet characters", () => {
    expect(isListItemCharacter("-")).toBe(true);
    expect(isListItemCharacter("•")).toBe(true);
    expect(isListItemCharacter("–")).toBe(true);
  });

  it("rejects longer strings and other characters", () => {
    expect(isListItemCharacter("--")).toBe(false);
    expect(isListItemCharacter("*")).toBe(false);
  });

  it("recognises a bulleted line", () => {
    expect(isListItem("- an item")).toBe(true);
    expect(isListItem("  • an item")).toBe(true);
  });

  it("rejects a line without a bullet or without the following space", () => {
    expect(isListItem("an item")).toBe(false);
    expect(isListItem("-noSpace")).toBe(false);
  });

  it("recognises a numbered line", () => {
    expect(isNumberedListItem("1. an item")).toBe(true);
    expect(isNumberedListItem("  12. an item")).toBe(true);
  });

  it("rejects a numbered line without the trailing space", () => {
    expect(isNumberedListItem("1.an item")).toBe(false);
  });
});

describe("escapeHtml", () => {
  it("escapes the three HTML-significant characters", () => {
    expect(escapeHtml('<a href="x">A & B</a>')).toBe(
      '&lt;a href="x"&gt;A &amp; B&lt;/a&gt;',
    );
  });

  it("leaves plain text unchanged", () => {
    expect(escapeHtml("plain text")).toBe("plain text");
  });
});

describe("wordMatch", () => {
  it("returns 1 for identical strings, ignoring case", () => {
    expect(wordMatch("Machine Learning", "machine learning")).toBe(1);
  });

  it("returns 0 for disjoint strings", () => {
    expect(wordMatch("alpha beta", "gamma delta")).toBe(0);
  });

  it("scores partial overlap against the longer string", () => {
    expect(wordMatch("alpha beta", "alpha gamma")).toBe(0.5);
  });
});
