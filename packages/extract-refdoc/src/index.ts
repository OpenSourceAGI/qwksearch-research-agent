/**
 * @fileoverview extract-refdoc (formerly paper-to-web / refdoc).
 *
 * The refdoc format: one `.refdoc.html` file holding the whole document,
 * which opens as a Fumadocs docs site (sidebar, contents, search,
 * references) from a CDN-hosted runtime — see `refdoc.ts`.
 *
 * Any PDF, research paper, archive link, DOI or text → the Synergy Slayer
 * paper format: numbered section pages with Section Summaries and `==card
 * underlining==`, read with Reader mode, Underlining on/off and Voice. Plus
 * AI outlines in that format from anything. Standalone: nothing here is
 * mounted by the debate-ai.com site.
 *
 * The React widget is at `extract-refdoc/widget` and the web app
 * handler at `extract-refdoc/server`; the CLI is `extract-refdoc`.
 *
 * @module extract-refdoc
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
export { applyUnderlines, autoUnderline, autoUnderlinePhrases, stripUnderlines, underlinedRuns, splitSentences } from "./highlight"
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
export { paperToHtml, figureHtml, paragraphsHtml, renderPaperBody, renderPaperReader, renderReaderToolbar, PAPER_READER_CSS } from "./html"
export { mountPaperReader, READER_RUNTIME_SOURCE, type PaperReaderHandle, type PaperReaderRuntimeOptions } from "./reader-runtime"
export { refdocPageInfo, type RefdocPageInfo } from "./page-info"
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
export {
  paperToRefdoc,
  paperToRefdocDocument,
  renderRefdocHtml,
  parseRefdoc,
  readRefdocFromDocument,
  linkCitations,
  refdocFileName,
  REFDOC_CDN,
  REFDOC_VERSION,
  REFDOC_PACKAGE_VERSION,
  OVERVIEW_ID,
  type RefdocDocument,
  type RefdocMeta,
  type RefdocPage,
  type RefdocHeading,
  type RefdocRuntime,
  type RenderRefdocOptions,
} from "./refdoc"
export {
  groupReferenceEntries,
  parseCardHeader,
  parseReferenceEntry,
  referenceCardHtml,
  referenceFlags,
  cardTextStatusLabel,
  REFERENCE_FLAG_LABELS,
  type ReferenceCard,
} from "./reference-card"
export {
  analyzeReference,
  classifySource,
  condenseQualification,
  formatAuthorsDisplay,
  isInstitutionName,
  cleanReferenceEntry,
  isQualifiedText,
  stripVideoLength,
  parseCitationAuthors,
  parseTagAuthors,
  shortYear,
  type ParsedAuthors,
  type ReferenceInput,
  type ReferenceMeta,
  type ReferenceType,
} from "./reference-meta"
export { analyzeCardText, cardTextStatus, MIN_FULL_WORDS, MIN_FRAGMENT_WORDS, type CardTextAnalysis, type CardTextStatus } from "./card-text-status"
export {
  buildSubmissionPayload,
  isSubmitEndpoint,
  validateCardTextSuggestion,
  CARD_TEXT_MIN_LENGTH,
  CARD_TEXT_MAX_LENGTH,
  type CardTextSubmissionPayload,
} from "./card-text-submission"
