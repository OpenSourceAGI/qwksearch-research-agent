/**
 * @description Abstract stream processor that buffers ("stashes") consecutive
 * items matching a predicate before flushing them as a group. Subclasses
 * implement `shouldStash`, `doMatchesStash`, and `doFlushStash` to define what
 * constitutes a run. Used by `WordDetectionStream` in `LineConverter` (grouping
 * same-format text spans) and `VerticalsStream` in `VerticalToHorizontal`
 * (merging single-character vertical lines into one horizontal line).
 */
// Abstract stream which allows stash items temporarily
export default class StashingStream {
  results: any[];
  stash: any[];

  constructor() {
    if (this.constructor === StashingStream) {
      throw new TypeError("Can not construct abstract class.");
    }
    this.results = [];
    this.stash = [];
  }

  consumeAll(items: any[]): void {
    items.forEach((item) => this.consume(item));
  }

  consume(item: any): void {
    if (this.shouldStash(item)) {
      if (!this.matchesStash(item)) {
        this.flushStash();
      }
      this.pushOnStash(item);
    } else {
      if (this.stash.length > 0) {
        this.flushStash();
      }
      this.results.push(item);
    }
  }

  pushOnStash(item: any): void {
    this.onPushOnStash(item);
    this.stash.push(item);
  }

  complete(): any[] {
    if (this.stash.length > 0) {
      this.flushStash();
    }
    return this.results;
  }

  matchesStash(item: any): boolean {
    if (this.stash.length === 0) {
      return true;
    }
    const lastItem = this.stash[this.stash.length - 1];
    return this.doMatchesStash(lastItem, item);
  }

  flushStash(): void {
    if (this.stash.length > 0) {
      this.doFlushStash(this.stash, this.results);
      this.stash = [];
    }
  }

  onPushOnStash(item: any): void {
    // sub-classes may override
  }

  shouldStash(item: any): boolean {
    throw new TypeError(" Do not call abstract method foo from child." + item);
  }

  doMatchesStash(lastItem: any, item: any): boolean {
    throw new TypeError(
      " Do not call abstract method foo from child." + lastItem + item,
    );
  }

  doFlushStash(stash: any[], results: any[]): void {
    throw new TypeError(
      " Do not call abstract method foo from child." + stash + results,
    );
  }
}
