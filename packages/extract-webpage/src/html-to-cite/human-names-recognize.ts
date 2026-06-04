/**
 * @fileoverview Advanced human name recognition and normalization utility.
 * Distinguishes between person names and organizations using a 92k-entry name database.
 */
import dataHumanNames from "./human-names-92k.json";

// Common organization terms for detection - extended list from provided code
const TERMS_ORG =
  "abc,ag,ap,academy,advisors,agency,airbnb,amazon,america,american,apple,associated,association,atlantic," +
  "attorneys,authority,axel,bank,baptiste,bbc,bertelsmann,blackrock,bloomberg,bmw,boston,broadcasting,bureau," +
  "business,buzzfeed,cambridge,capital,cbs,center,chase,chicago,china,church,citigroup,clinic,club,cnn,coca-cola," +
  "college,commission,communications,cond\u00e9,consulting,corp,corps,costco,daily,department,der,deutsche,division,dow," +
  "economist,enterprises,eu,european,fabrication,facebook,fargo,ferrari,financial,ford,forbes,fox,france,fund," +
  "gannett,general,global,globe,gm,gmbh,goldman,google,group,guardian,harvard,hearst,herald,hill,holdings,home," +
  "honda,hospital,huffington,ibm,inc,industries,institute,intel,international,investments,jazeera,japan,jones," +
  "jpmorgan,lancet,laboratories,law,legal,linkedin,llc,los,ltd,manufacturing,macy's,mcdonald's,media,medical," +
  "mercedes-benz,meta,microsoft,ministry,mit,morgan,mosque,msnbc,nast,national,nato,nbc,netflix,news,newsweek," +
  "new,nike,nordstrom,npr,ny,organization,oxford,pa\u00eds,partners,pbs,pentagon,plc,politico,porsche,post,press," +
  "productions,r&d,regiment,retail,reuters,research,rt,sachs,school,science,scientific,securities,services,silicon," +
  "society,solutions,south,spacex,spiegel,springer,stanford,stanley,starbucks,straits,studios,sydney,synagogue," +
  "systems,target,team,tech,techcrunch,temple,tesla,the,thomson,times,toronto,toyota,trust,twitter,uber,union," +
  "united,university,usa,valley,vanguard,vice,volkswagen,volvo,vox,wall,walmart,welle,wells,who,white,wired," +
  "worldwide,works,world,wsj,york,yorker";

// Qualification terms that might suggest the name belongs to a person rather than an organization
const TERMS_QUALIFICATIONS =
  "is,senior,associate,professor,fellow,assistant,lecturer,ceo,staff,strategist,specialist,worked,directed," +
  "correspondent,president,author,director,prof,asst,editor,analyst,degree,administrator,served,member," +
  "institute,economist,reporter,head,heads,newspaper,deputy,advocate,colonel,officer,founder,founded,visiting," +
  "journalist,former,retired,expert,executive,manager,doctoral,candidate,chief,contributor,student,blogger," +
  "chair,chairman,major,general,ambassador,phd,secretary,physicist,engineer,research,office,school,department," +
  "writer,teacher,advisor,award,center,commentator,rand,brookings,heritage,cato,un,aei,forbes,nyt,cbo";

/**
 * Parses a full name into its component parts:
 * Title, Firstname, Prefix, Middle, Lastname, Honorific, Alias
 * https://en.wikipedia.org/wiki/List_of_family_name_affixes
 * @param {string} input - The full name to parse.
 * @returns {Object}
 */
const extractHumanNameParts = (input) => {
  // Initialize the result object
  const result = {
    prefix: "", //van der von de
    firstname: "",
    middle: "",
    lastname: "",
    honorific: "", //Jr Phd II
  };

  // Input validation
  if (!input || typeof input !== "string") {
    return result;
  }

  // Trim input and determine case fixing mode
  input = input.trim();
  const shouldFixCase =
    input === input.toUpperCase() || input === input.toLowerCase();

  // Define lists for parsing
  const lists = {
    honorific: ["esq", "esquire", "jr", "sr", "ii", "iii", "iv", "phd",
      "md", "ms", "mrs", "mr", "miss", "dr"],
    prefix: ["de", "van", "von", "der", "den", "vel", "le", "la", "da"],
    title: ["mr", "mrs", "ms", "miss", "dr", "rev", "prof"],
  };

  // Extract alias
  const aliasRegex =
    /\s(['']([^'']+)['']|[""]([^""]+)[""]|\[([^\]]+)\]|\(([^\)]+)\)),?\s/g;
  const aliasMatch = input.match(aliasRegex);
  if (aliasMatch) {
    input = input.replace(aliasRegex, " ");
  }

  // Split the name into parts
  let parts = input.split(/\s+/);

  // Extract honorific
  const honorificIndex = parts.findIndex((part) =>
    lists.honorific.includes(part.toLowerCase().replace(/\.$/, ""))
  );
  if (honorificIndex !== -1) {
    result.honorific = parts.splice(honorificIndex).join(", ");
  }

  // Extract title
  const titleIndex = parts.findIndex((part) =>
    lists.title.includes(part.toLowerCase().replace(/\.$/, ""))
  );
  if (titleIndex !== -1) {
    result.prefix = parts.splice(titleIndex, 1)[0];
  }

  // Join prefixes to following name parts
  for (let i = parts.length - 2; i >= 0; i--) {
    if (lists.prefix.includes(parts[i]?.toLowerCase())) {
      parts[i] += " " + parts[i + 1];
      parts.splice(i + 1, 1);
    }
  }

  // Extract lastname name (if comma present)
  const commaIndex = parts.findIndex((part) => part.endsWith(","));
  if (commaIndex !== -1) {
    result.lastname = parts
      .splice(0, commaIndex + 1)
      .join(" ")
      .replace(/,$/, "");
  } else {
    result.lastname = parts.pop();
  }

  // Assign remaining parts to firstname and middle names
  if (parts.length > 0) {
    result.firstname = parts.shift();
    if (parts.length > 0) {
      result.middle = parts.join(" ");
    }
  }

  // Fix case if needed
  if (shouldFixCase) {
    Object.keys(result).forEach((key) => {
      if (result[key]) {
        result[key] = result[key]
          .split(" ")
          .map(
            (word) => word.charAt(0).toUpperCase() + word.slice(1)?.toLowerCase()
          )
          .join(" ");
      }
    });
  }

  return result;
};

export interface ExtractHumanNameOptions {
  formatCiteShortenAuthor?: boolean;
  maxAuthorsBeforeEtAl?: number;
}

/**
 * Validates and formats author names properly handling multiple authors and multi-word names
 *
 * @param {string} author - The author name string(s) to be processed
 * @param {ExtractHumanNameOptions} [options={}] - Configuration options
 * @returns {object} Formatted author information for citation
 */
export function extractHumanName(
  author: string,
  options: ExtractHumanNameOptions = {}
) {
  const { formatCiteShortenAuthor = false, maxAuthorsBeforeEtAl = 2 } = options;

  if (!author || !author.split) {
    return { author_cite: "", author_short: "", author_type: 4 };
  }

  // Clean up the input string
  author = author.trim()
    .replace(/^by:?\s*/i, "")  // Remove "by:" prefix
    .replace(/\s{2,}/g, " ");  // Normalize spaces

  // Split into multiple authors if present
  const authorNames = splitMultipleAuthors(author);

  if (authorNames.length === 0) {
    return { author_cite: "", author_short: "", author_type: 4 };
  }

  // Process each author
  const processedAuthors = authorNames.map(authorName => {
    // Check if name is likely an organization
    const isOrg = isOrganization(authorName);

    // Extract name parts using the provided function
    const nameParts = extractHumanNameParts(authorName);

    return {
      original: authorName,
      nameParts,
      isOrg
    };
  });

  // Determine overall author type
  let authorType = 4; // Default to unknown

  if (processedAuthors.length === 1) {
    authorType = processedAuthors[0].isOrg ? 3 : 0; // 3 = org, 0 = single
  } else if (processedAuthors.length === 2) {
    authorType = 1; // two-author
  } else if (processedAuthors.length > 2) {
    authorType = 2; // more-than-two
  }

  // Format authors for citation
  const formattedAuthors = processedAuthors.map(author => {
    if (author.isOrg) {
      // Don't reverse organization names
      const maxOrgNameLength = 60;
      let orgName = author.original;
      if (orgName.length > maxOrgNameLength) {
        orgName = orgName.substring(0, orgName.slice(0, maxOrgNameLength).lastIndexOf(" "));
      }
      return {
        cite: orgName,
        short: orgName
      };
    } else {
      // Format human name using name parts
      const nameParts = author.nameParts;

      // Handle empty or malformed name parts
      if (!nameParts || !nameParts.lastname) {
        return { cite: author.original, short: author.original };
      }

      let formattedFirstName = nameParts.firstname;

      // Include middle name with first name if present
      if (nameParts.middle) {
        formattedFirstName += " " + nameParts.middle;
      }

      // Add prefix to last name if present
      let lastName = nameParts.lastname;
      if (nameParts.prefix) {
        lastName = `${nameParts.prefix} ${lastName}`;
      }

      // Shorten first name if option is set
      if (formatCiteShortenAuthor && formattedFirstName) {
        formattedFirstName = formattedFirstName
          .split(/\s+/)
          .map(part => part[0] + ".")
          .join(" ");
      }

      // Add honorific if present
      let cite = `${lastName}, ${formattedFirstName}`.trim();
      if (nameParts.honorific) {
        cite += `, ${nameParts.honorific}`;
      }

      return {
        cite: cite.replace(/,\s*$/, ""),
        short: lastName
      };
    }
  });

  // Generate citation strings
  let authorCite, authorShort;

  if (authorType === 0 || authorType === 3) {
    // Single author or organization
    authorCite = formattedAuthors[0].cite;
    authorShort = formattedAuthors[0].short;
  } else if (authorType === 1) {
    // Two authors
    authorCite = `${formattedAuthors[0].cite} & ${formattedAuthors[1].cite}`;
    authorShort = `${formattedAuthors[0].short} & ${formattedAuthors[1].short}`;
  } else if (authorType === 2) {
    // More than two authors
    if (processedAuthors.length <= maxAuthorsBeforeEtAl) {
      // List all authors with commas and "and" before the last one
      const lastAuthor = formattedAuthors.pop();
      authorCite = formattedAuthors.map(a => a.cite).join(", ");
      if (lastAuthor) {
        authorCite += ` & ${lastAuthor.cite}`;
      }
      authorShort = `${formattedAuthors[0].short} et al.`;
    } else {
      // Use et al. format
      authorCite = `${formattedAuthors[0].cite} et al.`;
      authorShort = `${formattedAuthors[0].short} et al.`;
    }
  } else {
    // Unknown/error case
    authorCite = author;
    authorShort = author;
  }

  return {
    author_cite: authorCite,
    author_short: authorShort,
    author_type: authorType
  };
}

/**
 * Splits a string containing multiple authors into individual author names
 * 
 * @param {string} authorString - String potentially containing multiple authors
 * @returns {string[]} Array of individual author names
 */
function splitMultipleAuthors(authorString) {
  if (!authorString) return [];

  // Remove "et al." since we're parsing actual authors
  authorString = authorString.replace(/\s+et\s+al\.?/gi, "");

  // Handle common formatting patterns for multiple authors

  // Pattern 1: Last, First & Last, First
  if (/\w+,\s*\w+\s*&\s*\w+,\s*\w+/.test(authorString)) {
    return authorString.split(/\s*&\s*/);
  }

  // Pattern 2: Last, First, Last, First, and Last, First
  if (/\w+,\s*\w+,\s*\w+,\s*\w+/.test(authorString)) {
    // Replace the last comma+and with a standard separator
    authorString = authorString.replace(/,\s*(and|&)\s*(?=[^,]*$)/, " & ");
    return authorString.split(/\s*,\s*(?=[^,]*(?:,|$))/).map(s => s.trim());
  }

  // Pattern 3: First Last, First Last, and First Last
  if (/\w+\s\w+,\s\w+\s\w+/.test(authorString)) {
    // Replace the last comma+and with a standard separator
    authorString = authorString.replace(/,\s*(and|&)\s*(?=[^,]*$)/, " & ");
    return authorString.split(/\s*,\s*/).map(s => s.trim());
  }

  // Pattern 4: First Last and First Last
  if (/\w+\s\w+\s(and|&)\s\w+\s\w+/.test(authorString)) {
    return authorString.split(/\s+(and|&)\s+/).map(s => s.trim());
  }

  // Default pattern - try to split by various separators
  // Replace common author separators with a standard one for easier processing
  authorString = authorString
    .replace(/\s+and\s+/gi, " & ")
    .replace(/\s*[,;]\s*(?!(?:[^(]*\)))/g, " & ");  // Replace commas/semicolons outside parentheses

  // Split by the standard separator
  return authorString.split(/\s*&\s*/).filter(author => author.trim().length > 0);
}

/**
 * Determines if a name string represents an organization rather than a person
 * 
 * @param {string} nameString - The name to analyze
 * @returns {boolean} True if the name appears to be an organization
 */
function isOrganization(nameString) {
  if (!nameString) return false;

  // Convert organization terms to array
  const orgTerms = TERMS_ORG.split(",");
  const qualTerms = TERMS_QUALIFICATIONS.split(",");

  // Clean and normalize the name string
  const nameLower = nameString.toLowerCase().replace(/[^\w\s]/g, " ");
  const words = nameLower.split(/\s+/);

  // Check for organization terms
  for (const word of words) {
    if (orgTerms.includes(word)) {
      return true;
    }
  }

  // Check for qualification terms that suggest it's a person
  for (const word of words) {
    if (qualTerms.includes(word)) {
      return false;
    }
  }

  // Look for name patterns that suggest it's a person
  if (/,\s*\w+/.test(nameString)) {  // Has comma format like "Smith, John"
    return false;
  }

  // If there are more than 4 words and no commas, it's likely an organization
  if (words.length > 4 && !nameString.includes(",")) {
    return true;
  }

  // Check if the name contains any human name parts according to our database
  let hasHumanNamePart = false;
  for (const word of words) {
    const nameTitle = word[0]?.toUpperCase() + word.slice(1)?.toLowerCase();
    if (dataHumanNames[nameTitle] === 1 || dataHumanNames[nameTitle] === 2) {
      hasHumanNamePart = true;
      break;
    }
  }

  // If no human name parts found and more than 2 words, likely an organization
  return !hasHumanNamePart && words.length > 2;
}