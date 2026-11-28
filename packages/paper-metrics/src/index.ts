/**
 * @fileoverview paper-metrics: text statistics and readability for any
 * text — a dependency-free TypeScript rewrite of textstat.
 *
 * @module paper-metrics
 */
export { countWordSyllables } from "./syllables.js"
export {
  charCount,
  letterCount,
  lexiconCount,
  listParagraphs,
  listSentences,
  listWords,
  paragraphCount,
  sentenceCount,
} from "./text.js"
export {
  automatedReadabilityIndex,
  automatedReadabilityIndexFromCounts,
  colemanLiauIndex,
  colemanLiauIndexFromCounts,
  countText,
  daleChallReadabilityScore,
  daleChallReadabilityScoreFromCounts,
  difficultWords,
  difficultWordsList,
  fleschKincaidGrade,
  fleschKincaidGradeFromCounts,
  fleschReadingEase,
  fleschReadingEaseFromCounts,
  formatTextStandard,
  gradeSuffix,
  gunningFog,
  gunningFogFromCounts,
  linsearWriteFormula,
  polysyllableCount,
  readingTime,
  smogIndex,
  smogIndexFromCounts,
  syllableCount,
  textStandard,
  textStandardFromCounts,
  type TextCounts,
} from "./readability.js"
export { easyWords } from "./easy-words.js"
export {
  computeMetrics,
  getTextMetrics,
  MIN_WORDS,
  readabilityLabel,
  readingMinutes,
  SMOG_MIN_SENTENCES,
  WORDS_PER_MINUTE,
  type ReadabilityLabel,
  type TextMetrics,
} from "./metrics.js"
export { getHtmlMetrics, htmlToText } from "./html.js"
export { countAuthorDateCitations, pageStats, readableProse, type PageStats } from "./page-stats.js"
export {
  DASH,
  formatDate,
  formatReadability,
  formatReadingTime,
  NOT_ENOUGH_TEXT,
  pageInfoRows,
  READABILITY_COLORS,
  readabilityRows,
  SMOG_NOTE,
  type PageInfo,
  type PageInfoLabel,
  type PageInfoRowsInput,
  type ReadabilityRowLabel,
} from "./format.js"
