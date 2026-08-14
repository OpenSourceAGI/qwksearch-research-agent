/**
 * @module renameTypoSuggestion
 * @description Pure helper deciding whether a document/folder title being renamed has a
 * known typo worth surfacing, backing the inline "Did you mean…?" hint in `filetree.tsx`.
 * See TODO.md item #44 (extending typo correction beyond the search box).
 */
import { correctTypos } from "../lib/typo-correction";

/**
 * Returns a typo-corrected suggestion for `value`, or `null` when there's nothing worth
 * suggesting: empty/whitespace-only input, or a correction that doesn't actually change
 * anything once trimmed.
 */
export function getRenameTypoSuggestion(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const { corrected, hasCorrection } = correctTypos(trimmed);
  if (!hasCorrection || corrected === trimmed) return null;

  return corrected;
}
