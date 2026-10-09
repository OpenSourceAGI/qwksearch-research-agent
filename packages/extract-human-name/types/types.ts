/**
 * @fileoverview Public types for extract-human-name.
 */

/**
 * Configuration for {@link extractHumanName}.
 */
export interface HumanNameOptions {
  /**
   * Abbreviate given names to initials in the citation form
   * ("John Quincy Doe" → "Doe, J. Q."). Default `false`.
   */
  formatCiteShortenAuthor?: boolean;
  /**
   * How many authors to list in full before collapsing to
   * "First et al." for three or more authors. Default `2`.
   */
  maxAuthorsBeforeEtAl?: number;
}

/**
 * `author_type` values returned by {@link extractHumanName}:
 *
 * - `0` — empty or unparseable input
 * - `1` — a single person
 * - `2` — exactly two authors
 * - `3` — three or more authors
 * - `4` — a single organization
 */
export type AuthorType = 0 | 1 | 2 | 3 | 4;

/**
 * The structured citation output of {@link extractHumanName}.
 */
export interface HumanNameResult {
  /** Full citation form: "Doe, John" / "Doe, John & Smith, Jane" / "Doe, John et al." */
  author_cite: string;
  /** Short form: "Doe" / "Doe & Smith" / "Doe et al." */
  author_short: string;
  /** See {@link AuthorType}. */
  author_type: AuthorType;
}
