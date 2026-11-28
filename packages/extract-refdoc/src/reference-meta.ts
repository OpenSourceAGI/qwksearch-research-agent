/**
 * @fileoverview Reading a reference's citation: who wrote it, when, what kind
 * of source it is, and how to show the author line of a citation card.
 *
 * Pure string functions, no HTML and no DOM, so they are easy to test and the
 * rendering in `reference-card.ts` stays thin. Everything is a heuristic over
 * the Chicago-style citation, the debate-card tag ("Galloway (2020)") and the
 * author's qualifications line, so each helper is exported on its own.
 *
 * Author line, e.g. `Galloway '20 — longtime college debate coach at Samford University`:
 * - one author: the last name; two: "Hansson & Reijven"; three or more (or
 *   "et al." in the source): the first last name and "et al." — "Hansson et al.";
 * - an institutional author keeps its full name ("Brookings Institution '21");
 * - then the year as a tick and its last two digits, and an em dash with the
 *   qualifications, with the author's own name removed from them.
 *
 * @module reference-meta
 */

/** What kind of source a citation points at. */
export type ReferenceType = "journal" | "book" | "chapter" | "web" | "blog" | "video" | "news" | "report" | "unknown"

/** Everything the card needs from a citation. */
export interface ReferenceMeta {
  type: ReferenceType
  /** The qualifications mention a credential or senior role (professor, PhD, director, coach…). */
  isQualified: boolean
  /** An author is an organisation rather than a person. */
  isInstitution: boolean
  /** "Galloway", "Hansson & Reijven", "Hansson et al." — empty when no author was found. */
  authorsDisplay: string
  /** The year with its tick and last two digits: "'20" — empty when no year was found. */
  yearShort: string
  /** The qualifications without the author's name: "longtime college debate coach at Samford University". */
  qualification: string
  /** The standardized author line: "Galloway '20 — longtime college debate coach at Samford University". */
  authorLine: string
}

/** The pieces `analyzeReference` reads. Only the citation is required. */
export interface ReferenceInput {
  /** The full Chicago-style citation. */
  citation: string
  /** The card tag, "Galloway (2020)" or just "Galloway" — more reliable for author names and year. */
  tag?: string
  /** The qualifications line, "Ryan Galloway is a longtime college debate coach who…". */
  qualifications?: string
}

/** One parsed author list. */
export interface ParsedAuthors {
  /** Last names, or the full name of an institution. */
  names: string[]
  /** The source said "et al.". */
  etAl: boolean
  isInstitution: boolean
}

// ── Author names ───────────────────────────────────────────────────────────

const INSTITUTION_WORDS =
  /\b(?:University|Universities|College|Institute|Institution|Center|Centre|Council|Department|Dept|Bureau|Association|Commission|Foundation|Committee|Agency|Administration|Organi[sz]ation|Ministry|Office|Society|Board|Federation|Union|Academy|Laborator(?:y|ies)|Corporation|Corp|Company|Inc|LLC|Ltd|Group|Network|Alliance|Coalition|Fund|Trust|Authority|Service|Services|Survey|Bank|Associated Press|Nations|Congress|Senate|Parliament|Government|Court|Library|Museum|Observatory|Forum|League|Initiative|Policy Institute|Think Tank)\b/i

const ROMAN_SUFFIX = /^(?:II|III|IV|V|VI|JR|SR)$/i

/** True for organisations: "Brookings Institution", "Center for American Progress", "WHO", "RAND Europe". */
export function isInstitutionName(name: string): boolean {
  const text = name.replace(/[*_]/g, "").trim()
  if (!text) return false
  if (INSTITUTION_WORDS.test(text)) return true
  if (/\([A-Z]{2,8}\)/.test(text)) return true
  const tokens = text.split(/\s+/)
  const first = tokens[0].replace(/[.,]/g, "")
  if (tokens.length === 1) return /^[A-Z][A-Z&.-]{1,9}$/.test(tokens[0]) && !ROMAN_SUFFIX.test(first)
  if (text.includes(",")) return false
  // "RAND Europe", "NASA Goddard": an acronym leads. Two letters before a name are initials ("JD Vance").
  return /^[A-Z]{3,6}$/.test(first) && /^[A-Z]/.test(tokens[1]) && !ROMAN_SUFFIX.test(first)
}

/** Split "A, B and C" / "A & B" / "A; B" into names; reports a trailing "et al.". */
function splitNames(text: string): { parts: string[]; etAl: boolean } {
  let etAl = false
  const cleaned = text
    .replace(/[*_]/g, "")
    .replace(/,?\s+et\.?\s+al\.?/i, () => {
      etAl = true
      return ""
    })
    .replace(/\s*(?:;|&|\band\b)\s*/g, ", ")
  const parts = cleaned
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
  return { parts, etAl }
}

const SUFFIX = /^(?:Jr|Sr|II|III|IV)\.?$/i
const INITIALS = /^(?:[A-Z]\.?\s*){1,3}$/
const GIVEN = /^(?:[\p{Lu}][\p{L}'’.-]*|[a-z]{1,4})(?:\s+(?:[\p{Lu}][\p{L}'’.-]*|[a-z]{1,4})){0,3}$/u

/** "Sanne Reijven" → "Reijven"; "Mark Van Der Berg Jr." → "Berg"… keeps lower-case particles: "van der Berg". */
function lastNameOf(fullName: string): string {
  const tokens = fullName.split(/\s+/).filter((t) => !SUFFIX.test(t))
  let i = tokens.length - 1
  while (i > 0 && /^(?:van|von|der|den|de|del|della|di|da|la|le|bin|al|el|ter|ten)$/i.test(tokens[i - 1]) && /^[a-z]/.test(tokens[i - 1])) i--
  return tokens.slice(i).join(" ")
}

/**
 * Authors from a card tag: "Galloway", "Hansson & Reijven", "Hansson et al.",
 * "Smith, Jones, and Lee". The tag already carries last names (or an
 * organisation's name), so nothing is shortened.
 */
export function parseTagAuthors(tag: string): ParsedAuthors | null {
  const text = tag.replace(/\((?:\d{4}[a-z]?|n\.d\.|undated)\)/gi, "").replace(/\s+/g, " ").trim()
  if (!text) return null
  if (isInstitutionName(text)) return { names: [text.replace(/[,.]+$/, "")], etAl: false, isInstitution: true }
  const { parts, etAl } = splitNames(text)
  if (parts.length === 0) return null
  return { names: parts, etAl, isInstitution: parts.some(isInstitutionName) }
}

const ABBREVIATION = /(?:^|\s)(?:[A-Z]|Jr|Sr|Dr|Mr|Mrs|Ms|St|Inc|Co|Corp|Ltd|al|Prof|Ph|D|U|S)$/

/** The text before the first sentence-ending period (initials and "et al." do not end it) or the "(2020)" of an APA entry. */
function authorSegment(citation: string): string {
  const text = citation.replace(/^\s*(?:\[\d+\]|\d+[.)])\s*/, "").replace(/^[*_]+|[*_]+(?=\s|$)/g, "").trim()
  const apa = text.search(/\s\((?:\d{4}[a-z]?|n\.d\.)\)/)
  const limit = apa >= 0 ? apa : text.length
  for (const match of text.matchAll(/\.(?=\s|$)/g)) {
    const at = match.index ?? 0
    if (at >= limit) break
    const before = text.slice(0, at)
    const after = text.slice(at + 1).trimStart()
    if (ABBREVIATION.test(before) && !/^(?:["“(]|\d{4})/.test(after)) continue
    return before
  }
  return text.slice(0, limit)
}

/**
 * Authors from the front of a Chicago or APA citation. Returns null unless the
 * start really looks like an author list ("Last, First." / an organisation),
 * so a reference that opens with its title is not given a title as author.
 */
export function parseCitationAuthors(citation: string): ParsedAuthors | null {
  const segment = authorSegment(citation).replace(/^["“'‘]+/, "").trim()
  if (!segment || segment.length > 200 || /["“”]/.test(segment)) return null
  if (isInstitutionName(segment)) return { names: [segment], etAl: false, isInstitution: true }

  const { parts, etAl } = splitNames(segment)
  if (parts.length < 2) return null
  const names: string[] = []
  let i = 0
  // The first author is inverted ("Hansson, Sven Ove"); APA inverts every author.
  if (!GIVEN.test(parts[1]) && !INITIALS.test(parts[1])) return null
  if (!/^[\p{Lu}]/u.test(parts[0])) return null
  const apa = INITIALS.test(parts[1])
  names.push(parts[0])
  i = 2
  while (i < parts.length) {
    if (apa) {
      names.push(parts[i])
      i += 2
    } else {
      if (!GIVEN.test(parts[i]) && !INITIALS.test(parts[i])) return null
      names.push(lastNameOf(parts[i]))
      i += 1
    }
  }
  if (names.some((name) => !name || !/^[\p{L}]/u.test(name))) return null
  return { names, etAl, isInstitution: names.some(isInstitutionName) }
}

/** "Galloway" / "Hansson & Reijven" / "Hansson et al." (three or more authors, or an explicit "et al."). */
export function formatAuthorsDisplay(names: string[], etAl = false): string {
  const list = names.map((name) => name.trim()).filter(Boolean)
  if (list.length === 0) return ""
  if (list.length === 1) return etAl ? `${list[0]} et al.` : list[0]
  if (list.length === 2 && !etAl) return `${list[0]} & ${list[1]}`
  return `${list[0]} et al.`
}

// ── Year ───────────────────────────────────────────────────────────────────

/** The publication year of a citation, with any "a"/"b" suffix: "2020", "2020a". */
export function citationYear(citation: string, tag?: string): string {
  const fromTag = tag?.match(/\b((?:1[5-9]|20)\d{2}[a-z]?)\b/)
  if (fromTag) return fromTag[1]
  const text = authorSegmentRest(citation)
  const match = text.match(/\b((?:1[5-9]|20)\d{2}[a-z]?)(?![\d])/)
  return match?.[1] ?? ""
}

/** The citation after its author list, so a year inside a name or title prefix is not read first. */
function authorSegmentRest(citation: string): string {
  const segment = authorSegment(citation)
  return citation.slice(Math.min(citation.length, segment.length))
}

/** "2020" → "'20"; "2020a" → "'20a"; anything else → "". */
export function shortYear(year: string): string {
  const match = year.match(/^(?:1[5-9]|20)(\d{2})([a-z]?)$/)
  return match ? `'${match[1]}${match[2]}` : ""
}

// ── Qualifications ─────────────────────────────────────────────────────────

const QUALIFIER =
  /\b(?:dr|prof)\.|\b(?:professor|ph\.?\s?d|doctor(?:ate)?|director|coach|senior fellow|fellow|lecturer|instructor|researcher|scholar|chair(?:man|woman|person)?|dean|president|scientist|economist|historian|philosopher|attorney|lawyer|judge|justice|expert|analyst|author|editor|journalist|correspondent|physician|engineer|founder|ceo|curator|specialist)\b/i

/** The qualifications show a credential or senior role. */
export function isQualifiedText(text: string): boolean {
  return QUALIFIER.test(text)
}

const ABBREVIATIONS_IN_TEXT = /\b(?:Dr|Prof|Mr|Mrs|Ms|St|Jr|Sr|Ph|D|U|S|No)\./g

/** The text with the periods of common abbreviations blanked (same length), so a sentence split skips them. */
function protectAbbreviations(text: string): string {
  return text.replace(ABBREVIATIONS_IN_TEXT, (match) => `${match.slice(0, -1)}\u0001`)
}

/** `Ryan Galloway is a …` → the verb; names are capitalized words, optionally with particles. */
const SUBJECT_VERB =
  /^(?:(?:Dr|Prof|Professor|Mr|Ms|Mrs)\.?\s+)?(?:(?:[\p{Lu}][\p{L}'’.\-]*|de|van|von|der|den|la|le|bin|al|el)\s+){1,6}?(?:is|was|are|were|has been|serves as|works as|became)\s+(?:(?:currently|now|also|a|an|the)\s+)*/u

const APPOSITIVE = /^(?:(?:Dr|Prof|Professor|Mr|Ms|Mrs)\.?\s+)?(?:(?:[\p{Lu}][\p{L}'’.\-]*|de|van|von|der|den|la|le|bin|al|el)\s+){1,5}?[\p{Lu}][\p{L}'’.\-]*,\s+/u

const CLAUSE_BREAK =
  /(?:,?\s+(?:who|whose|whom|which|where|while|and (?:also |previously |formerly )?(?:writes|is|was|has|serves|works|teaches|directs|directed|edits|previously|formerly|also))\b|;|\s+—\s+)/

const INSTITUTION_AFTER_AT = /\b(?:at|for|with)\s+((?:the\s+)?[\p{Lu}][\p{L}&'’.\-]*(?:\s+(?:(?:of|for|the|and|de|&)\s+)?[\p{Lu}][\p{L}&'’.\-]*)*)/u

/** True when `text` reads as "Name is a …": a qualifications sentence about the author. */
export function looksLikeQualifications(text: string, authorNames: string[] = []): boolean {
  const plain = text.replace(/[*_]/g, "").trim()
  if (!plain || plain.length > 500) return false
  if (!SUBJECT_VERB.test(plain)) return false
  const mentionsAuthor = authorNames.some((name) => name && plain.toLowerCase().includes(name.toLowerCase().replace(/ et al\.$/, "")))
  return mentionsAuthor || isQualifiedText(plain)
}

/**
 * Shorten a qualifications sentence to the credential itself, without the
 * author's name: "Ryan Galloway is a longtime college debate coach who directed
 * debate at Samford University and writes on debate theory." →
 * "longtime college debate coach at Samford University".
 */
export function condenseQualification(raw: string, authorNames: string[] = []): string {
  let text = raw.replace(/[*_]/g, "").replace(/\s+/g, " ").trim()
  if (!text) return ""
  // First sentence only.
  const sentenceEnd = protectAbbreviations(text).search(/[.!?](?=\s+[\p{Lu}"“])/u)
  if (sentenceEnd >= 0) text = text.slice(0, sentenceEnd)

  const subject = text.match(SUBJECT_VERB)
  if (subject) text = text.slice(subject[0].length)
  else {
    const appositive = text.match(APPOSITIVE)
    if (appositive) text = text.slice(appositive[0].length)
  }
  // A name left in a sentence that has no verb after it ("Ryan Galloway, coach at X").
  for (const name of authorNames) {
    if (!name) continue
    text = text.replace(new RegExp(`^(?:(?:Dr|Prof|Professor)\\.?\\s+)?(?:[\\p{Lu}][\\p{L}'’.-]*\\s+)*${escapeRegExp(name.replace(/ et al\.$/, ""))}\\s*[,:–—-]\\s+`, "u"), "")
  }

  let head = text
  let tail = ""
  const clause = CLAUSE_BREAK.exec(text)
  if (clause) {
    head = text.slice(0, clause.index)
    tail = text.slice(clause.index)
  }
  head = head.replace(/[\s.,;:]+$/, "")
  if (!/\b(?:at|of|for|with)\s+(?:the\s+)?\p{Lu}/u.test(head) && tail) {
    const institution = tail.match(INSTITUTION_AFTER_AT)
    if (institution) head = `${head} at ${institution[1].replace(/[\s.,;:]+$/, "")}`
  }
  head = head.replace(/\s+/g, " ").trim()
  if (head.length > 140) head = `${head.slice(0, 139).replace(/\s+\S*$/, "")}…`
  return head
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

// ── Video length ───────────────────────────────────────────────────────────

const CLOCK = String.raw`(?:\d{1,2}:)?\d{1,2}:\d{2}`
const SPAN = String.raw`\d{1,3}\s*(?:hours?|hrs?|h)\b(?:\s*\d{1,2}\s*(?:minutes?|mins?|m)\b)?(?:\s*\d{1,2}\s*(?:seconds?|secs?|s)\b)?|\d{1,3}\s*(?:minutes?|mins?)\b(?:\s*\d{1,2}\s*(?:seconds?|secs?)\b)?`
const LENGTH = `(?:${CLOCK}(?!\\d|:|\\s?[ap]\\.?m\\b)|${SPAN})`
const LABEL = String.raw`(?:(?:video\s+)?(?:length|duration|runtime|running time)\s*:?\s*)?`
const VIDEO_LENGTH_BRACKETED = new RegExp(String.raw`\s*[(\[]\s*${LABEL}${LENGTH}\s*[)\]]`, "gi")
const VIDEO_LENGTH_BARE = new RegExp(String.raw`(?:,\s*|\s+)${LABEL}${LENGTH}(?![\w/:-])`, "gi")

/**
 * Drops the video length from a video citation: `(12:34)`, `[1:02:03]`,
 * `YouTube video, 12:04.`, `Duration: 12 min`, `1 hr 5 min`. Only video
 * citations are touched (see `classifySource`); the rest of the citation, its
 * date and its URL stay as written.
 */
export function stripVideoLength(citation: string): string {
  if (classifySource(citation) !== "video") return citation
  return citation
    .replace(VIDEO_LENGTH_BRACKETED, "")
    .replace(VIDEO_LENGTH_BARE, "")
    .replace(/[ \t]+([,.;])/g, "$1")
    .replace(/,\s*(?=[,.;)])/g, "")
    .replace(/(\w)\.\.(?!\.)/g, "$1.")
    .replace(/[ \t]{2,}/g, " ")
}

/** A reference entry as it is displayed or exported: the citation on its first line without a video length. */
export function cleanReferenceEntry(entry: string): string {
  const at = entry.indexOf("\n")
  if (at < 0) return stripVideoLength(entry)
  return stripVideoLength(entry.slice(0, at)) + entry.slice(at)
}

// ── Source type ────────────────────────────────────────────────────────────

const NEWS_OUTLETS =
  /\b(?:New York Times|Washington Post|Wall Street Journal|The Guardian|Reuters|Associated Press|BBC|CNN|NPR|Politico|Bloomberg|Financial Times|The Economist|Los Angeles Times|USA Today|Newsweek|The Atlantic|Foreign Policy|Foreign Affairs|The Hill|Vox|Axios|The New Yorker|Fox News|NBC News|ABC News|CBS News|Al Jazeera|Time magazine)\b|(?:nytimes|washingtonpost|theguardian|reuters|apnews|wsj|npr|bbc|cnn|politico|bloomberg|ft|economist|latimes|usatoday|newsweek|theatlantic|foreignpolicy|foreignaffairs|thehill|vox|axios|newyorker|foxnews|nbcnews|abcnews|cbsnews|aljazeera)\.(?:com|org|net|co\.uk|co)\b/i

/** Classify a citation as journal, book, chapter, blog, video, news, report, web page or unknown. */
export function classifySource(citation: string): ReferenceType {
  const text = citation.replace(/\s+/g, " ").trim()
  if (!text) return "unknown"
  const hasQuotedTitle = /["“][^"”]{3,}["”]/.test(text)
  const hasUrl = /(?:https?:\/\/|www\.|\bbit\.ly\/|\b[a-z0-9-]+\.(?:com|org|net|edu|gov|io|co|info|us|uk)\b)/i.test(text)

  if (/\b(?:youtube\.com|youtu\.be|vimeo\.com|ted\.com\/talks|dailymotion\.com)\b|\b(?:YouTube|Vimeo)\b|\[video\]|\bvideo\b/i.test(text)) return "video"
  if (/\b(?:substack|medium\.com|wordpress|blogspot|tumblr|ghost\.io|lesswrong|forum\.effectivealtruism|blog(?:post)?s?\b|Debate Roundup|Roundup|newsletter)\b|\.substack\.com|\bposted\b/i.test(text)) return "blog"
  if (NEWS_OUTLETS.test(text)) return "news"
  if (
    /\b(?:doi:|doi\.org\/|10\.\d{4,9}\/)|\b(?:jstor\.org|sciencedirect\.com|tandfonline\.com|onlinelibrary\.wiley\.com|link\.springer\.com|cambridge\.org\/core|academic\.oup\.com|pubmed|ncbi\.nlm\.nih\.gov)\b|\b[Vv]ol(?:ume|\.)\s*\d+|\b\d{1,3}\s?\(\d{1,2}\)(?!\d)|\bno\.\s*\d+\b(?=[^.]*\bpp?\.\s*\d)|\b(?:Journal of|Review of|Quarterly|Law Review|Annals of|Proceedings of|Transactions on|Letters)\b/i.test(text)
  )
    return "journal"
  if (/\b(?:report|white paper|working paper|policy brief|technical report|discussion paper|arXiv|SSRN|NBER|preprint|issue brief|testimony|thesis|dissertation|Congressional Research Service|GAO)\b/i.test(text)) return "report"
  if (/\bIn\s+[*_]?[\p{Lu}][^.]*,\s*(?:edited by|eds?\.)|\bedited by\b|\b(?:ed|eds)\.\s*(?:\d|[\p{Lu}])|\bpp?\.\s*\d+\s*[–-]\s*\d+/iu.test(text) && /\b(?:Press|Publishers?|Publishing|Books|Routledge|Springer|Wiley|Palgrave|Sage)\b/.test(text)) return "chapter"
  if (/\b(?:ISBN|Press|Publishers?|Publishing|Routledge|Springer|Palgrave|Penguin|Random House|Oxford|Cambridge|Harvard|Yale|Princeton|MIT Press|Basic Books|HarperCollins|Norton|Macmillan)\b|:\s*[\p{Lu}][^,.]{2,40},\s*(?:1[5-9]|20)\d{2}\b/u.test(text) && (!hasQuotedTitle || /\bPress\b/.test(text))) return "book"
  if (hasQuotedTitle && /\b(?:\d+\s*\(\d+\)|no\.\s*\d+|pp\.)/i.test(text)) return "journal"
  if (hasUrl || /\b(?:accessed|retrieved)\b/i.test(text)) return "web"
  return "unknown"
}

// ── The whole thing ────────────────────────────────────────────────────────

/** Everything the citation card needs, from the citation, the tag and the qualifications line. */
export function analyzeReference(input: ReferenceInput | string): ReferenceMeta {
  const { citation, tag, qualifications } = typeof input === "string" ? { citation: input, tag: undefined, qualifications: undefined } : input
  const fromTag = tag ? parseTagAuthors(tag) : null
  const fromCitation = parseCitationAuthors(citation)
  const authors = fromTag ?? fromCitation
  const authorsDisplay = authors ? formatAuthorsDisplay(authors.names, authors.etAl) : ""
  const yearShort = shortYear(citationYear(citation, tag))
  const qualification = qualifications ? condenseQualification(qualifications, authors?.names ?? []) : ""
  const isInstitution = Boolean(fromTag?.isInstitution || fromCitation?.isInstitution)
  const head = authorsDisplay ? [authorsDisplay, yearShort].filter(Boolean).join(" ") : ""
  return {
    type: classifySource(citation),
    isQualified: qualifications ? isQualifiedText(qualifications) : /\b(?:Dr\.|Ph\.?D)/.test(citation),
    isInstitution,
    authorsDisplay,
    yearShort,
    qualification,
    authorLine: qualification && head ? `${head} — ${qualification}` : head,
  }
}
