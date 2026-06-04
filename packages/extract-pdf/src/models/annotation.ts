/**
 * @description Diff-annotation markers used to tag document items during pipeline
 * transformations. Each `Annotation` carries a human-readable `category` and a
 * display `color`. Pre-built singletons (`ADDED_ANNOTATION`, `REMOVED_ANNOTATION`,
 * `UNCHANGED_ANNOTATION`, `DETECTED_ANNOTATION`, `MODIFIED_ANNOTATION`) are
 * attached to page items so debug views can highlight what each stage changed.
 */
export default class Annotation {
  category: string;
  color: string;

  constructor(options: { category: string; color: string }) {
    this.category = options.category;
    this.color = options.color;
  }
}

export const ADDED_ANNOTATION = new Annotation({
  category: "Added",
  color: "green",
});

export const REMOVED_ANNOTATION = new Annotation({
  category: "Removed",
  color: "red",
});

export const UNCHANGED_ANNOTATION = new Annotation({
  category: "Unchanged",
  color: "brown",
});

export const DETECTED_ANNOTATION = new Annotation({
  category: "Detected",
  color: "green",
});

export const MODIFIED_ANNOTATION = new Annotation({
  category: "Modified",
  color: "green",
});
