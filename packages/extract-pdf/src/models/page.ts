/**
 * @description Simple container for a single PDF page. Holds a 0-based `index`
 * and an `items` array whose element type evolves through the transformation
 * pipeline: raw `TextItem[]` → compacted `LineItem[]` → grouped `LineItemBlock[]`
 * → final serialized text objects.
 */
// A page which holds PageItems displayable via PdfPageView
export default class Page {
  index: number;
  items: any[];

  constructor(options: { index: number; items?: any[] }) {
    this.index = options.index;
    this.items = options.items || [];
  }
}
