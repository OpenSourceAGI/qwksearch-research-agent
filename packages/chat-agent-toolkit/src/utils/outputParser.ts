/**
 * @module agent-toolkit/utils/outputParser
 * @description Parsers that extract values from XML-tagged sections of LLM
 * output (e.g. `<links>...</links>`, `<question>...</question>`).
 */

const LIST_MARKER_REGEX = /^(\s*(-|\*|\d+\.\s|\d+\)\s|•)\s*)+/;

interface LineListOutputParserArgs {
  key?: string;
}

export class LineListOutputParser {
  private key = "questions";

  constructor(args?: LineListOutputParserArgs) {
    this.key = args?.key ?? this.key;
  }

  async parse(text: string): Promise<string[]> {
    text = text.trim() || "";

    const startKeyIndex = text.indexOf(`<${this.key}>`);
    const endKeyIndex = text.indexOf(`</${this.key}>`);

    if (startKeyIndex === -1 || endKeyIndex === -1) {
      return [];
    }

    const questionsStartIndex = startKeyIndex + `<${this.key}>`.length;
    const lines = text
      .slice(questionsStartIndex, endKeyIndex)
      .trim()
      .split("\n")
      .filter((line) => line.trim() !== "")
      .map((line) => line.replace(LIST_MARKER_REGEX, ""));

    return lines;
  }
}

interface LineOutputParserArgs {
  key?: string;
}

export class LineOutputParser {
  private key = "questions";

  constructor(args?: LineOutputParserArgs) {
    this.key = args?.key ?? this.key;
  }

  async parse(text: string): Promise<string | undefined> {
    text = text.trim() || "";

    const startKeyIndex = text.indexOf(`<${this.key}>`);
    const endKeyIndex = text.indexOf(`</${this.key}>`);

    if (startKeyIndex === -1 || endKeyIndex === -1) {
      return undefined;
    }

    const questionsStartIndex = startKeyIndex + `<${this.key}>`.length;
    const line = text
      .slice(questionsStartIndex, endKeyIndex)
      .trim()
      .replace(LIST_MARKER_REGEX, "");

    return line;
  }
}

export default LineOutputParser;
