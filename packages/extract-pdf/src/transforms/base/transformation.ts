/**
 * @description Abstract root class for all PDF pipeline stages. Enforces that
 * subclasses implement `transform(parseResult)` and stores `name` (for debug
 * display) and `itemType` (the class name of the items each stage produces,
 * used for view routing). `completeTransform` is a no-op by default; subclasses
 * override it to flush deferred mutations after the stage's debug view is rendered.
 */
import ParseResult from "../../models/parse-result";

// A transformation from an PdfPage to an PdfPage
export default class Transformation {
  name: string;
  itemType: string;

  constructor(name: string, itemType: string) {
    if (this.constructor === Transformation) {
      throw new TypeError("Can not construct abstract class.");
    }
    if (this.transform === Transformation.prototype.transform) {
      throw new TypeError("Please implement abstract method 'transform()'.");
    }
    this.name = name;
    this.itemType = itemType;
  }

  transform(parseResult: ParseResult): ParseResult {
    throw new TypeError("Do not call abstract method foo from child.");
  }

  completeTransform(parseResult: ParseResult): ParseResult {
    parseResult.messages = [];
    return parseResult;
  }
}

