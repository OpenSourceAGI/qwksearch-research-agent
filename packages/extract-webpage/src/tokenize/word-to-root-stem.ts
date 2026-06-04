/**
 * @fileoverview Implementation of the Porter Stemmer algorithm for word normalization.
 * Used to reduce words to their root form (e.g., "running" to "run").
 */
/**
 * Stems a word using the [Porter
 * Stemmer](https://snowballstem.org/algorithms/porter/stemmer.html)
 * for removing inflectional endings like "ing", "ist", "ize".
 *
 * @author [Porter, M. (1980)](https://tartarus.org/martin/PorterStemmer/)
 * @param word - The word to be stemmed
 * @returns The stemmed word
 * @example const rootWord = stemWordToRoot("running"); // returns "run"
 * @category Topics
 */
export function stemWordToRoot(word: string): string {
  // Return short words (less than 3 characters) without stemming
  if (word.length < 3) return word;

  const SUFFIX_MAPS = {
    step2: {
      ational: "ate",
      tional: "tion",
      enci: "ence",
      anci: "ance",
      izer: "ize",
      bli: "ble",
      alli: "al",
      entli: "ent",
      eli: "e",
      ousli: "ous",
      ization: "ize",
      ation: "ate",
      ator: "ate",
      alism: "al",
      iveness: "ive",
      fulness: "ful",
      ousness: "ous",
      aliti: "al",
      iviti: "ive",
      biliti: "ble",
      logi: "log",
    },
    step3: {
      icate: "ic",
      ative: "",
      alize: "al",
      iciti: "ic",
      ical: "ic",
      ful: "",
      ness: "",
    },
  };

  const REGEX = {
    consonant: /[^aeiou]/,
    vowel: /[aeiouy]/,
    consonants: /([^aeiou][^aeiouy]*)/,
    vowels: /([aeiouy][aeiou]*)/,
    gt0: /^([^aeiou][^aeiouy]*)?([aeiouy][aeiou]*)([^aeiou][^aeiouy]*)/,
    eq1: /^([^aeiou][^aeiouy]*)?([aeiouy][aeiou]*)([^aeiou][^aeiouy]*)([aeiouy][aeiou]*)?$/,
    gt1: /^([^aeiou][^aeiouy]*)?([aeiouy][aeiou]*[^aeiou][^aeiouy]*){2,}/,
    vowelInStem: /^([^aeiou][^aeiouy]*)?[aeiouy]/,
    consonantLike: /^([^aeiou][^aeiouy]*)[aeiouy][^aeiouwxy]$/,
    sfxLl: /ll$/,
    sfxE: /^(.+?)e$/,
    sfxY: /^(.+?)y$/,
    sfxIon: /^(.+?(s|t))(ion)$/,
    sfxEdOrIng: /^(.+?)(ed|ing)$/,
    sfxAtOrBlOrIz: /(at|bl|iz)$/,
    sfxEED: /^(.+?)eed$/,
    sfxS: /^.+?[^s]s$/,
    sfxSsesOrIes: /^.+?(ss|i)es$/,
    sfxMultiConsonantLike: /([^aeiouylsz])\1$/,
    step2:
      /^(.+?)(ational|tional|enci|anci|izer|bli|alli|entli|eli|ousli|ization|ation|ator|alism|iveness|fulness|ousness|aliti|iviti|biliti|logi)$/,
    step3: /^(.+?)(icate|ative|alize|iciti|ical|ful|ness)$/,
    step4:
      /^(.+?)(al|ance|ence|er|ic|able|ible|ant|ement|ment|ent|ou|ism|ate|iti|ous|ive|ize)$/,
  };

  let stem = word.toLowerCase();

  // Special handling for words starting with 'y'
  const firstCharWasY = stem[0] === "y";
  if (firstCharWasY) stem = "Y" + stem.slice(1);

  // Step 1a: Handle plural forms and -ed or -ing suffixes
  stem = stem
    .replace(REGEX.sfxSsesOrIes, "$1")
    .replace(REGEX.sfxS, (s) => s.slice(0, -1));

  // Step 1b: Handle -eed, -ed, -ing suffixes
  let match;
  if ((match = REGEX.sfxEED.exec(stem))) {
    if (REGEX.gt0.test(match[1])) stem = stem.slice(0, -1);
  } else if (
    (match = REGEX.sfxEdOrIng.exec(stem)) &&
    REGEX.vowelInStem.test(match[1])
  ) {
    stem = match[1];
    if (REGEX.sfxAtOrBlOrIz.test(stem)) {
      stem += "e";
    } else if (REGEX.sfxMultiConsonantLike.test(stem)) {
      stem = stem.slice(0, -1);
    } else if (REGEX.consonantLike.test(stem)) {
      stem += "e";
    }
  }

  // Step 1c: Replace suffix y or Y by i if preceded by a non-vowel
  if ((match = REGEX.sfxY.exec(stem)) && REGEX.vowelInStem.test(match[1])) {
    stem = match[1] + "i";
  }

  // Step 2: Handle various suffixes
  if ((match = REGEX.step2.exec(stem)) && REGEX.gt0.test(match[1])) {
    stem = match[1] + SUFFIX_MAPS.step2[match[2]];
  }

  // Step 3: Handle more suffixes
  if ((match = REGEX.step3.exec(stem)) && REGEX.gt0.test(match[1])) {
    stem = match[1] + SUFFIX_MAPS.step3[match[2]];
  }

  // Step 4: Handle even more suffixes
  if ((match = REGEX.step4.exec(stem))) {
    if (REGEX.gt1.test(match[1])) stem = match[1];
  } else if ((match = REGEX.sfxIon.exec(stem)) && REGEX.gt1.test(match[1])) {
    stem = match[1];
  }

  // Step 5a: Remove final e
  if (
    (match = REGEX.sfxE.exec(stem)) &&
    (REGEX.gt1.test(match[1]) ||
      (REGEX.eq1.test(match[1]) && !REGEX.consonantLike.test(match[1])))
  ) {
    stem = match[1];
  }

  // Step 5b: Remove final ll
  if (REGEX.sfxLl.test(stem) && REGEX.gt1.test(stem)) {
    stem = stem.slice(0, -1);
  }

  // Restore initial Y if it was changed
  if (firstCharWasY) stem = "y" + stem.slice(1);

  return stem;
}
