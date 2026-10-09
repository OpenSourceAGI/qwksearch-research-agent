import { PROFESSIONAL_PATTERNS, PARSE_LISTS } from "./constants";

/**
 * Represents the structural components of a globally recognizable human name.
 */
export interface ParsedNameParts {
  /** Academic or professional title (e.g. Dr, Mr, Prof) */
  title: string;
  /** Given name */
  firstname: string;
  /** Additional given names */
  middle: string;
  /** Family name / Surname (includes standard name prefixes like van, de) */
  lastname: string;
  /** Appendages, degrees, or generational suffixes (e.g., Jr, Ph.D) */
  honorific: string;
}

/**
 * Removes professional qualifications, post-nominals, and working titles from an author name.
 * @param {string} authorName - The raw string name.
 * @returns {string} The cleaned author name without credentials.
 */
export function cleanProfessionalQualifications(authorName: string): string {
  if (!authorName) return "";

  let cleaned = authorName.trim();

  // Strip each known qualification pattern
  for (const pattern of PROFESSIONAL_PATTERNS) {
    cleaned = cleaned.replace(pattern, " ");
  }

  // Eliminate redundant spaces and leading/trailing punctuation
  return cleaned
    .replace(/\s+/g, " ")
    .replace(/^[,;.\s]+/, "")
    .replace(/[,;.\s]+$/, "")
    .trim();
}

/**
 * Parses a full biological name into its primary components.
 * Accounts for alias removal, normalization of case, extraction of suffixes,
 * handling of complex multipart last names, and common prefix combinations.
 *
 * @see https://en.wikipedia.org/wiki/List_of_family_name_affixes
 *
 * @param {string} input - The raw, full name string to extract components from.
 * @returns {ParsedNameParts} An object mapping `title`, `firstname`, `middle`, `lastname`, and `honorific`.
 */
export const extractHumanNameParts = (input: string): ParsedNameParts => {
  const result: ParsedNameParts = {
    title: "",
    firstname: "",
    middle: "",
    lastname: "",
    honorific: "",
  };

  if (!input) return result;

  let processedInput = input.trim();
  const isUppercase = processedInput === processedInput.toUpperCase();
  const isLowercase = processedInput === processedInput.toLowerCase();
  const shouldFixCase = isUppercase || isLowercase;

  // Extract and strip alias mappings strictly
  // E.g. John "The Rocket" Doe -> John Doe
  const aliasRegex = /\s(['"]([^'"]+)['"]|\[([^\]]+)\]|\(([^)]+)\)),?\s/g;
  processedInput = processedInput.replace(aliasRegex, " ");

  const parts = processedInput.split(/\s+/).filter(Boolean);

  // Isolate prefix titled elements. Titles are pulled out *before* honorifics:
  // the two lists overlap ("Dr", "Mr", "Ms", "Mrs", "Miss" appear in both), and
  // the honorific pass below swallows everything from its match to the end of
  // the name. Running it first on "Dr. John Q. Public Jr." would file the whole
  // name away as an honorific and leave every other field empty.
  const titleIndex = parts.findIndex((part) =>
    PARSE_LISTS.title.has(part.toLowerCase().replace(/\.$/, "")),
  );
  if (titleIndex !== -1) {
    result.title = parts.splice(titleIndex, 1)[0] ?? "";
  }

  // Isolate and extract honorifics logically
  const honorificIndex = parts.findIndex((part) =>
    PARSE_LISTS.honorific.has(part.toLowerCase().replace(/\.$/, "")),
  );
  if (honorificIndex !== -1) {
    result.honorific = parts.splice(honorificIndex).join(", ");
  }

  // Group traditional multi-word family prefixes efficiently
  for (let i = parts.length - 2; i >= 0; i--) {
    if (PARSE_LISTS.prefix.has(parts[i]?.toLowerCase() ?? "")) {
      parts[i] = `${parts[i]} ${parts[i + 1]}`;
      parts.splice(i + 1, 1);
    }
  }

  // Resolve the primary last name based on comma presence ("Doe, John")
  const commaIndex = parts.findIndex((part) => part.endsWith(","));
  if (commaIndex !== -1) {
    // If format is `Last, First Middle`, then everything before comma is last name
    result.lastname = parts
      .splice(0, commaIndex + 1)
      .join(" ")
      .replace(/,$/, "");
  } else {
    result.lastname = parts.pop() ?? "";
  }

  // Remainder components align to first and middle names
  if (parts.length > 0) {
    result.firstname = parts.shift() ?? "";
    if (parts.length > 0) {
      result.middle = parts.join(" ");
    }
  }

  // Case normalization safely restores formatting for entirely upper/lowercase text
  if (shouldFixCase) {
    const fixCase = (str: string) =>
      str
        .split(" ")
        .map((word) =>
          word
            ? word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
            : "",
        )
        .join(" ");

    result.title = fixCase(result.title);
    result.firstname = fixCase(result.firstname);
    result.middle = fixCase(result.middle);
    result.lastname = fixCase(result.lastname);
    result.honorific = fixCase(result.honorific);
  }

  return result;
};
