/**
 * @fileoverview Detects and corrects common English typos in free-form text (e.g. document
 * titles, search queries, prompts) using a static dictionary of ~8k known misspellings. URLs,
 * code-like tokens, and words containing digits (model identifiers, versions) are left
 * untouched so intentional technical terms aren't mangled.
 *
 * Mirrors `packages/research-agent-ui/src/lib/typo-correction.ts` (kept as a separate copy
 * since `react-reason-editor` is a standalone published package with no dependency on
 * `research-agent-ui`). See TODO.md item #44.
 */
import typoDictionaryRaw from "./misspelled-typos-8k.json";

export interface TypoCorrection {
  original: string;
  corrected: string;
}

export interface TypoCorrectionResult {
  /** The input text with known typos replaced. Equal to the input when nothing changed. */
  corrected: string;
  /** True when at least one word was corrected. */
  hasCorrection: boolean;
  /** Each individual word-level correction that was applied, in order of appearance. */
  corrections: TypoCorrection[];
}

// The raw dataset mixes single-word entries with noisy multi-word/annotation entries
// (usage notes, code keywords quoted as 'false'/'null'/'true', no-op self-mappings).
// Keep only single alphabetic-word keys whose correction is itself a short, clean
// word or phrase — that's the subset safe to auto-apply without more context.
const CLEAN_CORRECTION = /^[A-Za-zÀ-ɏ][A-Za-zÀ-ɏ'. -]*[A-Za-zÀ-ɏ.]$/;

function isCleanCorrection(key: string, value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (/["[\]:;]/.test(trimmed)) return false;
  if (trimmed.startsWith("'") || trimmed.endsWith("'")) return false;
  if (trimmed.split(/\s+/).length > 3) return false;
  if (trimmed.toLowerCase() === key.toLowerCase()) return false;
  return CLEAN_CORRECTION.test(trimmed);
}

const typoDictionary: Record<string, string> = Object.fromEntries(
  Object.entries(typoDictionaryRaw as Record<string, string>)
    .filter(([key]) => /^[A-Za-z]+$/.test(key))
    .filter(([key, value]) => isCleanCorrection(key, value))
    .map(([key, value]) => [key.toLowerCase(), value.trim()]),
);

const WHITESPACE_SPLIT = /(\s+)/;
const LEADING_NON_ALPHA = /^[^A-Za-z]+/;
const TRAILING_NON_ALPHA = /[^A-Za-z]+$/;
const PURE_ALPHA = /^[A-Za-z]+$/;

function matchCase(source: string, replacement: string): string {
  if (source.length > 1 && source === source.toUpperCase()) {
    return replacement.toUpperCase();
  }
  if (source[0] === source[0].toUpperCase() && source.slice(1) === source.slice(1).toLowerCase()) {
    return replacement[0].toUpperCase() + replacement.slice(1);
  }
  return replacement;
}

/**
 * Finds and corrects common English typos in `text`, preserving whitespace and casing.
 *
 * A word is only ever corrected when everything but its leading/trailing punctuation is
 * plain alphabetic text. That single rule is what keeps URLs (`https://recieve.example.com`),
 * code-like tokens (`npm_run/recieve.sh`), and identifiers with embedded digits or symbols
 * (`gpt-4`, `kimi-k2.5`) untouched, since none of those reduce to a pure-alphabetic core.
 */
export function correctTypos(text: string): TypoCorrectionResult {
  if (!text) {
    return { corrected: text, hasCorrection: false, corrections: [] };
  }

  const corrections: TypoCorrection[] = [];
  const segments = text.split(WHITESPACE_SPLIT);

  const correctedSegments = segments.map((segment) => {
    if (!segment) return segment;

    const leading = segment.match(LEADING_NON_ALPHA)?.[0] ?? "";
    const withoutLeading = segment.slice(leading.length);
    const trailing = withoutLeading.match(TRAILING_NON_ALPHA)?.[0] ?? "";
    const core = withoutLeading.slice(0, withoutLeading.length - trailing.length);

    if (!PURE_ALPHA.test(core)) return segment;

    const replacement = typoDictionary[core.toLowerCase()];
    if (!replacement) return segment;

    const cased = matchCase(core, replacement);
    corrections.push({ original: core, corrected: cased });
    return leading + cased + trailing;
  });

  return {
    corrected: correctedSegments.join(""),
    hasCorrection: corrections.length > 0,
    corrections,
  };
}
