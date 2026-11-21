/**
 * @fileoverview Paper to Web AI — `@debate-ai/paper-to-web`.
 *
 * Any PDF, research paper, archive link, DOI or text → the Synergy Slayer
 * paper format: numbered section pages with Section Summaries and `==card
 * underlining==`, read with Reader mode, Underlining on/off and Voice. Plus
 * AI outlines in that format from anything. Standalone: nothing here is
 * mounted by the debate-ai.com site.
 *
 * The React widget is at `@debate-ai/paper-to-web/widget` and the web app
 * handler at `@debate-ai/paper-to-web/server`; the CLI is `paper-to-web`.
 *
 * @module paper-to-web
 */
export type { Paper, PaperFigure, PaperSection, SummaryPoint } from "./types"
export { convertToPaper, type ConvertMode, type ConvertOptions } from "./pipeline"
export {
  loadPaper,
  normalizeSourceUrl,
  isLinkInput,
  isPdfBuffer,
  extractWithExtractWebpage,
  type Extractor,
  type ExtractedSource,
  type LoadOptions,
} from "./source"
export { htmlToPaper, textToPaper, stripSectionNumber, mergeBrokenParagraphs, type PaperMeta } from "./html-to-paper"
export { finishPaper, readOnlyUnderlined, summarizeSection, describeSection } from "./finish"
export { applyUnderlines, autoUnderline, stripUnderlines, underlinedRuns, splitSentences } from "./highlight"
export {
  paperToMdxFiles,
  paperToSingleMdx,
  sectionToMdx,
  indexToMdx,
  referencesToMdx,
  paperMeta,
  slugify,
  sectionSlug,
  type MdxOptions,
} from "./mdx"
export { paperToHtml, renderPaperBody, renderPaperReader, renderReaderToolbar, PAPER_READER_CSS } from "./html"
export { mountPaperReader, READER_RUNTIME_SOURCE, type PaperReaderHandle, type PaperReaderRuntimeOptions } from "./reader-runtime"
export {
  createAnthropicGenerator,
  enhancePaperWithAi,
  enhanceSectionWithAi,
  generateOutline,
  paperToPlainText,
  parseJsonReply,
  DEFAULT_MODEL,
  type TextGenerator,
  type AnthropicGeneratorOptions,
  type OutlineOptions,
} from "./ai"
export { markdownInlineToHtml, markdownToPlainText, escapeMdxText } from "./markdown"
