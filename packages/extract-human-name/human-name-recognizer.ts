/**
 * @fileoverview Resolves strings containing humans and organizations into citation objects.
 */

import type { HumanNameOptions, HumanNameResult } from "../types/types";
import { splitMultipleAuthors } from "./author-splitter";
import {
  cleanProfessionalQualifications,
  extractHumanNameParts,
} from "./name-parser";
import { isOrganization } from "./is-organization";

export * from "../types/types";
export * from "./constants";
export * from "./name-parser";
export * from "./author-splitter";
export * from "./is-organization";

/**
 * Systematically extracts, characterizes, and strictly structures citation outputs
 * from arbitrary, mixed author textual inputs (e.g., parsing debate cards).
 *
 * Determines whether authors are individual entities, multiple partners, or institutional organizations,
 * outputting both standard explicit citation and shorthand forms.
 *
 * @param {string} author - Raw unformatted author string fragment (e.g., "by: Dr. John Smith and Jane Doe").
 * @param {HumanNameOptions} options - Configuration guidelines for shortening formats or ET AL thresholds.
 * @returns {HumanNameResult} Cleanly typed compilation resolving specific citation blocks.
 */
export function extractHumanName(
  author: string,
  options: HumanNameOptions = {},
): HumanNameResult {
  const { formatCiteShortenAuthor = false, maxAuthorsBeforeEtAl = 2 } = options;

  if (!author || typeof author !== "string") {
    return { author_cite: "", author_short: "", author_type: 4 };
  }

  // Baseline sanitize prefix markers and erratic structural spaces
  const sanitized = author
    .trim()
    .replace(/^by:?\s*/i, "")
    .replace(/\s{2,}/g, " ");

  const authorNames = splitMultipleAuthors(sanitized);
  if (authorNames.length === 0) {
    return { author_cite: "", author_short: "", author_type: 4 };
  }

  // Sequentially digest discrete segment bounds
  const processedAuthors = authorNames.map((authorName) => {
    const cleanedAuthorName = cleanProfessionalQualifications(authorName);
    const isOrg = isOrganization(cleanedAuthorName);
    const nameParts = extractHumanNameParts(cleanedAuthorName);

    return {
      original: authorName,
      cleaned: cleanedAuthorName,
      nameParts,
      isOrg,
    };
  });

  // Calculate cardinality-based author classification schema parameter
  let authorType = 0;
  if (processedAuthors.length === 1) {
    authorType = processedAuthors[0].isOrg ? 4 : 1;
  } else if (processedAuthors.length === 2) {
    authorType = 2;
  } else if (processedAuthors.length > 2) {
    authorType = 3;
  }

  // Iterate structured formatting application
  const formattedAuthors = processedAuthors.map((item) => {
    if (item.isOrg) {
      const maxOrgNameLength = 60;
      let orgName = item.cleaned || item.original;

      // Limit absurdly long org names reasonably
      if (orgName.length > maxOrgNameLength) {
        const breakAt = orgName.slice(0, maxOrgNameLength).lastIndexOf(" ");
        orgName = orgName.substring(
          0,
          breakAt > 0 ? breakAt : maxOrgNameLength,
        );
      }
      return { cite: orgName, short: orgName };
    }

    const { firstname, middle, lastname, title, honorific } =
      item.nameParts || {};
    if (!lastname) {
      return {
        cite: item.cleaned || item.original,
        short: item.cleaned || item.original,
      };
    }

    let finalFirst = firstname;
    if (middle) finalFirst += ` ${middle}`;

    // Applying abbreviated initializations to forenames conditionally
    if (formatCiteShortenAuthor && finalFirst) {
      finalFirst = finalFirst
        .split(/\s+/)
        .map((p) => `${p[0] || ""}.`)
        .join(" ");
    }

    let finalLast = lastname;
    if (title) finalLast = `${title} ${finalLast}`;

    let citeCompile = `${finalLast}, ${finalFirst}`.trim();
    if (honorific) citeCompile += `, ${honorific}`;

    return {
      cite: citeCompile.replace(/,\s*$/, ""),
      short: finalLast,
    };
  });

  let authorCite = "";
  let authorShort = "";

  // Combine components explicitly via inferred structure type
  if (authorType === 1 || authorType === 4) {
    authorCite = formattedAuthors[0]?.cite ?? "";
    authorShort = formattedAuthors[0]?.short ?? "";
  } else if (authorType === 2) {
    authorCite = `${formattedAuthors[0]?.cite} & ${formattedAuthors[1]?.cite}`;
    authorShort = `${formattedAuthors[0]?.short} & ${formattedAuthors[1]?.short}`;
  } else if (authorType === 3) {
    if (processedAuthors.length <= maxAuthorsBeforeEtAl) {
      const last = formattedAuthors.pop();
      authorCite = formattedAuthors.map((a) => a.cite).join(", ");
      if (last) authorCite += ` & ${last.cite}`;
      authorShort = `${formattedAuthors[0]?.short} et al.`;
    } else {
      authorCite = `${formattedAuthors[0]?.cite} et al.`;
      authorShort = `${formattedAuthors[0]?.short} et al.`;
    }
  } else {
    // Graceful exception escape
    const genericClean = cleanProfessionalQualifications(author);
    authorCite = genericClean || author;
    authorShort = genericClean || author;
  }

  return {
    author_cite: authorCite,
    author_short: authorShort,
    author_type: authorType,
  };
}
