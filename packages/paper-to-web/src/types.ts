/**
 * @fileoverview The shape every input becomes before it is written out. A
 * `Paper` mirrors how the Synergy Slayer papers are laid out in help-docs
 * (`content/docs/learn/critiques/synergy-slayer-critiques/`): an index page
 * with the abstract, then one page per numbered section, each with an
 * optional figure, a "Section Summary" accordion of bold-lead points, and
 * numbered paragraphs whose card underlining is written as `==text==`.
 *
 * @module types
 */

/** One figure: an image and its `*Figure N: …*` caption. */
export interface PaperFigure {
  src: string
  caption: string
}

/** One "Section Summary" point: `**label:** text`. */
export interface SummaryPoint {
  label: string
  text: string
}

/** One section page. */
export interface PaperSection {
  /** Heading without the number, as plain text (not markdown), e.g. "Original Sin". */
  title: string
  /** One-line page description (frontmatter `description`). */
  description?: string
  /** Optional part heading this section opens (a `---Part---` separator in meta.json). */
  part?: string
  figure?: PaperFigure
  summary: SummaryPoint[]
  /**
   * Body paragraphs in markdown. `==text==` marks the underlined words, the
   * way a debater reads only the marked part of a card.
   */
  paragraphs: string[]
}

/** A whole paper (or an outline generated in the paper's format). */
export interface Paper {
  /** Plain text, like section titles and parts. Everything else is markdown. */
  title: string
  /** Subtitle / one-line description. */
  description?: string
  author?: string
  date?: string
  /** Where it came from. */
  sourceUrl?: string
  /** A formatted citation, when the extractor found one. */
  cite?: string
  abstract?: string
  keywords?: string[]
  figure?: PaperFigure
  sections: PaperSection[]
  /** Reference list entries, as markdown. */
  references: string[]
}
