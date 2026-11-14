import { TERMS_ORG, TERMS_QUALIFICATIONS, ORG_PATTERNS } from "./constants";
import { COMMON_HUMAN_NAMES } from "./common-names";
import { getHumanNamesDB } from "./human-names-db";

/**
 * Whether a single lower-cased word is a common given name or surname.
 *
 * Uses the 92k-entry database when one is loaded (see human-names-db.ts),
 * and the compact built-in list otherwise. The sources are keyed in
 * lower case, so callers must pass a lower-cased word.
 */
function isKnownHumanNameWord(word: string): boolean {
  const db = getHumanNamesDB();
  if (db) return db[word] === 1 || db[word] === 2;
  return COMMON_HUMAN_NAMES.has(word);
}

/**
 * Validates whether a provided name string conceptually applies to a registered organization,
 * corporation, publication, or government entity vs a discrete human.
 *
 * @param {string} nameString - The analyzed string representation.
 * @returns {boolean} `true` if heuristically categorized as an organization.
 */
export function isOrganization(nameString: string): boolean {
  if (!nameString) return false;

  const nameLower = nameString.toLowerCase().replace(/[^\w\s]/g, " ");
  const words = nameLower.split(/\s+/).filter(Boolean);

  // Short rigid acronym block identifies rapid organizations (e.g., NAACP, WHO)
  if (/^[A-Z]{2,6}$/.test(nameString.trim())) {
    return true;
  }

  // Organization dict scan. Roughly a quarter of the dictionary doubles as a
  // human given name or surname — "doe" (Dept. of Energy) and "jones" (Dow
  // Jones) are in there next to "institution" and "reuters" — so a lone
  // ambiguous hit is not enough to call "John Doe" an organization. A single
  // *unambiguous* term is decisive; ambiguous ones only count in pairs, which
  // is what carries firm names like "Morgan Stanley" and "Wells Fargo".
  const orgHits = words.filter((word) => TERMS_ORG.has(word));
  const decisiveOrgHits = orgHits.filter((word) => !isKnownHumanNameWord(word));
  if (decisiveOrgHits.length > 0 || orgHits.length > 1) return true;

  // Qualification dict scan (counter-balance for "Professor Institute ABC")
  for (const word of words) {
    if (TERMS_QUALIFICATIONS.has(word)) return false;
  }

  // Last, First name inversion standard
  if (/,\s*\w+/.test(nameString)) {
    return false;
  }

  // Robust standard organizational lexical phrases match
  for (const pattern of ORG_PATTERNS) {
    if (pattern.test(nameString)) return true;
  }

  // Arbitrary length fail-over. Most humans lack > 4 distinct name elements.
  if (words.length > 4 && !nameString.includes(",")) return true;

  // Cross-reference against the common human-names list. The list is keyed in
  // lower case, and `words` is already lower-cased above, so the two
  // line up without any re-casing.
  return !words.some(isKnownHumanNameWord) && words.length > 2;
}
