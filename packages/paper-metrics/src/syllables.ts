/**
 * @fileoverview Syllable counting without a pronunciation dictionary.
 *
 * textstat looks words up in the CMU Pronouncing Dictionary (and falls back
 * to Pyphen hyphenation); shipping either would dwarf this package. Instead
 * this counts vowel groups and corrects for the usual English exceptions
 * (silent final and inner "e", "-es"/"-ed" endings, "-tion", "-le", "qu",
 * "n't", "-ing" after a vowel). It agrees with textstat's CMU counts on about
 * 98% of the Dale-Chall easy words and about 92% of a random sample of the
 * CMU dictionary (which is heavy with proper names), so a whole text's total
 * is usually within a few percent of textstat's.
 *
 * @module syllables
 */

/** Words the rules get wrong often enough to matter in running prose. */
const EXCEPTIONS: Record<string, number> = {
  ago: 2,
  any: 2,
  anyone: 3,
  area: 3,
  being: 2,
  beloved: 3,
  business: 2,
  camera: 3,
  chocolate: 2,
  create: 2,
  created: 3,
  creative: 3,
  crooked: 2,
  diamond: 2,
  different: 3,
  evening: 2,
  family: 3,
  hundred: 2,
  idea: 3,
  interest: 3,
  interested: 3,
  interesting: 3,
  many: 2,
  mr: 2,
  mrs: 2,
  naked: 2,
  our: 2,
  people: 2,
  poem: 2,
  quiet: 2,
  real: 1,
  really: 2,
  sacred: 2,
  science: 2,
  several: 3,
  someone: 2,
  something: 2,
  sometimes: 2,
  somewhere: 2,
  valuable: 3,
  wicked: 2,
}

/**
 * Syllables in one word. Numbers count as one syllable; anything without a
 * letter or digit counts as zero.
 *
 * @example
 * countWordSyllables("interpersonal") // 5
 */
export function countWordSyllables(word: string): number {
  const letters = word.toLowerCase().replace(/’/g, "'").replace(/[^a-z']/g, "")
  const plain = letters.replace(/'/g, "")
  if (!plain) return /\d/.test(word) ? 1 : 0
  const known = EXCEPTIONS[plain]
  if (known !== undefined) return known
  if (plain.length <= 3) return 1

  let extra = 0
  if (/[^aeiouy]n't$/.test(letters)) extra++
  if (/[aeiouy]ing$/.test(plain)) extra++
  if (/(?:[^aeiouy]ire|(?:^|[^yfpt])our)[sd]?$/.test(plain)) extra++
  if (/[^aeiouy]isms?$/.test(plain)) extra++

  let stem = plain
    .replace(/qu/g, "qw")
    .replace(/gu(?=[aio]|e(?!$))/g, "gw")
    .replace(/(?<=[aeioun])gue$/, "g")
    .replace(/(?<=[^aeiouy])e(?=(?:ly|ful|ness|ment|less|let)s?$)/, "")
    .replace(/(?<=[^aeiouyl]|ll)es$/, (_match, _offset, whole: string) => (/(?:[sxzcg]|[cs]h)es$/.test(whole) ? "es" : ""))
    .replace(/(?<=[^tde])ed$/, "")
    .replace(/(?<=[^aeiouy])e$/, "")
    .replace(/([tscgh])ion/g, "$1on")
    .replace(/([cgtx])i(?=ous)/g, "$1")
    .replace(/(?<=[cgst])ia(?=l|n)/g, "a")
  if (!stem) stem = plain

  let count = stem.match(/[aeiouy]+/g)?.length ?? 0
  count += stem.match(/ia|io|iu|ua|uo|eo/g)?.length ?? 0
  if (/[^aeiouyl]le[sd]?$/.test(plain) && !/[aeiouy]l$/.test(stem)) count++
  return Math.max(1, count + extra)
}
