/**
 * @fileoverview Writes a `CitationData` as an APA 7, MLA 9, Chicago
 * (notes-bibliography), Harvard, IEEE or BibTeX entry. Pure and offline: no
 * model call, so the same data can be re-styled for free.
 *
 * Italics are carried as private-use markers while a string is built, then
 * turned into nothing (`text`) or `<i>` (`html`, with everything escaped).
 */
import {
  CITATION_STYLES,
  type CitationAuthor,
  type CitationData,
  type CitationStyle,
  type FormattedCitation,
} from "./types";

const I0 = "";
const I1 = "";
const ital = (s: string) => `${I0}${s}${I1}`;

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const MONTHS_MLA = ["Jan.", "Feb.", "Mar.", "Apr.", "May", "June", "July", "Aug.", "Sept.", "Oct.", "Nov.", "Dec."];
const MONTHS_IEEE = ["Jan.", "Feb.", "Mar.", "Apr.", "May", "Jun.", "Jul.", "Aug.", "Sep.", "Oct.", "Nov.", "Dec."];

interface DateParts {
  y?: number;
  m?: number;
  d?: number;
}

export function parseDateParts(iso: string | undefined): DateParts {
  const match = iso?.match(/^(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?/);
  if (!match) return {};
  return {
    y: Number(match[1]),
    m: match[2] ? Number(match[2]) : undefined,
    d: match[3] ? Number(match[3]) : undefined,
  };
}

/** Adds a closing period unless the string already ends in terminal punctuation. */
const stop = (s: string) => (/[.?!][’"'\)]*$/.test(s) ? s : `${s}.`);
const join = (parts: (string | undefined | false)[], sep = " ") => parts.filter(Boolean).join(sep);
const stripProtocol = (url: string) => url.replace(/^https?:\/\//i, "").replace(/\/$/, "");

/** `J. K.` from "Joanne Kathleen" / "Jean-Paul". */
function initials(given: string | undefined, spaced: boolean): string {
  if (!given) return "";
  const parts = given
    .split(/\s+/)
    .flatMap((word) => word.split("-").map((p, i, all) => ({ p, hyphen: i < all.length - 1 })))
    .filter(({ p }) => p);
  return parts
    .map(({ p, hyphen }) => `${p.replace(/\.$/, "")[0].toUpperCase()}.${hyphen ? "-" : ""}`)
    .join(spaced ? " " : "")
    .replace(/-\s/g, "-");
}

/** Splits "Given Family" when the model gave only a full name. */
function nameParts(a: CitationAuthor): { given: string; family: string } {
  if (a.family) return { given: a.given || "", family: a.family };
  const words = a.name.split(/\s+/);
  if (words.length === 1) return { given: "", family: words[0] };
  return { given: words.slice(0, -1).join(" "), family: words[words.length - 1] };
}

const withSuffix = (family: string, a: CitationAuthor) => (a.suffix ? `${family}, ${a.suffix}` : family);

/** "Family, Given" (inverted) or "Given Family" (natural), organizations untouched. */
function fullName(a: CitationAuthor, inverted: boolean): string {
  if (a.isOrganization) return a.name;
  const { given, family } = nameParts(a);
  if (!given) return family;
  return inverted ? `${family}, ${given}${a.suffix ? `, ${a.suffix}` : ""}` : `${given} ${withSuffix(family, a)}`;
}

function initialName(a: CitationAuthor, opts: { inverted: boolean; spaced: boolean }): string {
  if (a.isOrganization) return a.name;
  const { given, family } = nameParts(a);
  const ini = initials(given, opts.spaced);
  if (!ini) return family;
  return opts.inverted ? `${family}, ${ini}${a.suffix ? `, ${a.suffix}` : ""}` : `${ini} ${withSuffix(family, a)}`;
}

function listNames(names: string[], joiner: string, serialComma: boolean): string {
  if (names.length <= 1) return names[0] || "";
  if (names.length === 2) return `${names[0]}${joiner === "&" ? "," : ""} ${joiner} ${names[1]}`;
  return `${names.slice(0, -1).join(", ")}${serialComma ? "," : ""} ${joiner} ${names[names.length - 1]}`;
}

const isPeriodical = (c: CitationData) => c.sourceType === "journal-article";
/** Types whose title sits inside a larger work, so it gets quotes or no style. */
const isPartOfWork = (c: CitationData) =>
  c.sourceType === "news-article" || c.sourceType === "journal-article" || c.sourceType === "blog-post";

function doiUrl(c: CitationData): string | undefined {
  return c.doi ? `https://doi.org/${c.doi}` : undefined;
}

function apaDate(c: CitationData): string {
  const { y, m, d } = parseDateParts(c.publishedDate);
  if (!y) return "n.d.";
  // Journals take the year alone; everything else the day when known.
  if (isPeriodical(c)) return String(y);
  return m ? `${y}, ${MONTHS[m - 1]}${d ? ` ${d}` : ""}` : String(y);
}

function apaAuthors(authors: CitationAuthor[]): string {
  const names = authors.map((a) => initialName(a, { inverted: true, spaced: true }));
  if (names.length > 20) return `${names.slice(0, 19).join(", ")}, . . . ${names[names.length - 1]}`;
  return listNames(names, "&", true);
}

export function formatAPA(c: CitationData): string {
  const authors = apaAuthors(c.authors);
  const date = `(${apaDate(c)}).`;
  const doi = doiUrl(c);
  // An undated page may change, so APA says when it was read.
  const retrieved = parseDateParts(c.accessedDate);
  const link =
    doi ||
    (c.url && !c.publishedDate && retrieved.y && retrieved.m && retrieved.d
      ? `Retrieved ${MONTHS[retrieved.m - 1]} ${retrieved.d}, ${retrieved.y}, from ${c.url}`
      : c.url);
  const title = c.title || "Untitled";
  const container = c.containerTitle;
  // A site that is also the author is not repeated (APA 7, 9.20).
  const sameAsAuthor =
    container && c.authors.length === 1 && c.authors[0].name.toLowerCase() === container.toLowerCase();

  let heading: string;
  let rest: string | undefined;
  if (isPeriodical(c)) {
    heading = stop(title);
    const vol = join([c.volume && ital(c.volume), c.issue && `(${c.issue})`], "");
    const tail = [container && ital(container), vol || undefined, c.pages].filter(Boolean).join(", ");
    rest = tail && stop(tail);
  } else if (isPartOfWork(c)) {
    heading = stop(title);
    rest = container && stop(ital(container));
  } else {
    heading = stop(`${ital(title)}${c.sourceType === "video" ? " [Video]" : ""}`);
    const site = c.publisher || (sameAsAuthor ? undefined : container);
    rest = site && stop(site);
  }
  // No author: the title leads and the date follows it.
  const lead = authors ? [stop(authors), date, heading] : [heading, date];
  return join([...lead, rest, link]);
}

function mlaDate(iso: string | undefined): string | undefined {
  const { y, m, d } = parseDateParts(iso);
  if (!y) return undefined;
  return join([d && String(d), m && MONTHS_MLA[m - 1], String(y)]);
}

function mlaAuthors(authors: CitationAuthor[]): string {
  if (authors.length === 0) return "";
  if (authors.length === 1) return fullName(authors[0], true);
  if (authors.length === 2) return `${fullName(authors[0], true)}, and ${fullName(authors[1], false)}`;
  return `${fullName(authors[0], true)}, et al`;
}

export function formatMLA(c: CitationData): string {
  // A site that is its own author is named once, as the publisher.
  const selfAuthored =
    c.authors.length === 1 && c.authors[0].isOrganization && c.authors[0].name.toLowerCase() === (c.containerTitle || "").toLowerCase();
  const authors = selfAuthored ? "" : mlaAuthors(c.authors);
  const date = mlaDate(c.publishedDate);
  const link = doiUrl(c) || (c.url ? stripProtocol(c.url) : undefined);
  const title = c.title || "Untitled";
  const container = c.containerTitle;

  let rest: string;
  if (isPartOfWork(c)) {
    rest = join(
      [
        [
          container && ital(container),
          c.sourceType === "journal-article" ? c.volume && `vol. ${c.volume}` : c.publisher !== container && c.publisher,
          c.sourceType === "journal-article" && c.issue && `no. ${c.issue}`,
          date,
          c.pages && `pp. ${c.pages}`,
          link,
        ]
          .filter(Boolean)
          .join(", "),
      ],
      " "
    );
  } else {
    rest = [c.publisher || container, date, link].filter(Boolean).join(", ");
  }
  const heading = isPartOfWork(c) ? `“${stop(title)}”` : stop(ital(title));
  return join([authors && stop(authors), heading, rest && stop(rest)]);
}

function chicagoDate(iso: string | undefined): string | undefined {
  const { y, m, d } = parseDateParts(iso);
  if (!y) return undefined;
  return m ? `${MONTHS[m - 1]}${d ? ` ${d}` : ""}, ${y}` : String(y);
}

function chicagoAuthors(authors: CitationAuthor[]): string {
  if (authors.length === 0) return "";
  const names = (authors.length > 10 ? authors.slice(0, 7) : authors).map((a, i) => fullName(a, i === 0));
  if (authors.length > 10) return `${names.join(", ")}, et al`;
  return names.length === 2 ? `${names[0]}, and ${names[1]}` : listNames(names, "and", true);
}

export function formatChicago(c: CitationData, accessed?: string): string {
  const authors = chicagoAuthors(c.authors);
  const date = chicagoDate(c.publishedDate);
  const link = doiUrl(c) || c.url;
  const title = c.title || "Untitled";
  const container = c.containerTitle;
  const access = !date && accessed ? `Accessed ${chicagoDate(accessed)}.` : undefined;

  if (isPeriodical(c)) {
    const issue = join([container && ital(container), [c.volume, c.issue && `no. ${c.issue}`].filter(Boolean).join(", ")]);
    const where = join([issue, date && `(${parseDateParts(c.publishedDate).y})`, c.pages && `: ${c.pages}`], " ").replace(/ :/, ":");
    return join([authors && stop(authors), `“${stop(title)}”`, stop(where), link && stop(link)]);
  }
  if (c.sourceType === "news-article") {
    return join([
      authors && stop(authors),
      `“${stop(title)}”`,
      stop([container && ital(container), date].filter(Boolean).join(", ")),
      access,
      link && stop(link),
    ]);
  }
  if (c.sourceType === "webpage" || c.sourceType === "blog-post") {
    return join([
      authors && stop(authors),
      `“${stop(title)}”`,
      container && stop(container),
      c.publisher && c.publisher !== container && stop(c.publisher),
      date && stop(date),
      access,
      link && stop(link),
    ]);
  }
  return join([
    authors && stop(authors),
    stop(ital(title)),
    c.publisher && stop(c.publisher),
    date && stop(date),
    access,
    link && stop(link),
  ]);
}

function harvardAuthors(authors: CitationAuthor[]): string {
  if (authors.length === 0) return "";
  if (authors.length > 3) return `${initialName(authors[0], { inverted: true, spaced: false })} et al.`;
  return listNames(authors.map((a) => initialName(a, { inverted: true, spaced: false })), "and", false);
}

export function formatHarvard(c: CitationData, accessed?: string): string {
  const { y, m, d } = parseDateParts(c.publishedDate);
  const authors = harvardAuthors(c.authors);
  const year = y ? `(${y})` : "(no date)";
  const title = c.title || "Untitled";
  const link = doiUrl(c) || c.url;
  const acc = accessed ? parseDateParts(accessed) : undefined;
  const accessText = acc?.y && !(isPeriodical(c) && c.doi) ? `(Accessed: ${acc.d} ${MONTHS[(acc.m || 1) - 1]} ${acc.y}).` : undefined;

  let heading: string;
  let rest: string | undefined;
  if (isPartOfWork(c)) {
    heading = `\u2018${title}\u2019,`;
    const tail = [c.containerTitle && ital(c.containerTitle), c.volume, c.issue && `(${c.issue})`, c.pages && `pp. ${c.pages}`]
      .filter(Boolean)
      .join(", ")
      .replace(", (", "(");
    // Day and month are for dated pieces; journals are cited by year and volume.
    const day = !isPeriodical(c) && m ? `${d ? `${d} ` : ""}${MONTHS[m - 1]}` : undefined;
    rest = stop([tail, day].filter(Boolean).join(", "));
  } else {
    heading = stop(ital(title));
    rest = c.publisher && stop(c.publisher);
  }
  const lead = authors ? [authors, year, heading] : [isPartOfWork(c) ? heading.replace(/,$/, "") : heading, year];
  return join([...lead, rest, link && `Available at: ${link}`, accessText]);
}

function ieeeAuthors(authors: CitationAuthor[]): string {
  if (authors.length === 0) return "";
  if (authors.length > 6) return `${initialName(authors[0], { inverted: false, spaced: true })} et al.`;
  const names = authors.map((a) => initialName(a, { inverted: false, spaced: true }));
  return names.length === 2 ? `${names[0]} and ${names[1]}` : listNames(names, "and", true);
}

export function formatIEEE(c: CitationData, accessed?: string): string {
  const { y, m, d } = parseDateParts(c.publishedDate);
  const authors = ieeeAuthors(c.authors);
  const title = c.title || "Untitled";
  const date = y ? join([m && MONTHS_IEEE[m - 1], m && d && `${d},`, String(y)]) : "n.d";
  const acc = accessed ? parseDateParts(accessed) : undefined;
  const accessText = acc?.y ? `(accessed ${MONTHS_IEEE[(acc.m || 1) - 1]} ${acc.d}, ${acc.y}).` : undefined;

  const parts: string[] = [];
  if (authors) parts.push(`${authors},`);
  parts.push(c.sourceType === "book" ? `${ital(title)},` : `“${title},”`);
  if (isPeriodical(c)) {
    const tail = [c.containerTitle && ital(c.containerTitle), c.volume && `vol. ${c.volume}`, c.issue && `no. ${c.issue}`, c.pages && `pp. ${c.pages}`, date].filter(Boolean);
    parts.push(`${tail.join(", ")}${c.doi ? `, doi: ${c.doi}.` : "."}`);
  } else {
    const tail = [c.containerTitle && c.containerTitle !== title && (c.sourceType === "book" ? c.containerTitle : ital(c.containerTitle)), c.publisher, date].filter(Boolean);
    parts.push(`${tail.join(", ")}.`);
    if (c.url) parts.push(`[Online]. Available: ${c.url}`);
    if (accessText) parts.push(accessText);
  }
  return parts.join(" ").replace(/,\s*\./g, ".");
}

const BIB_ESCAPES: Record<string, string> = { "\\": "\\textbackslash{}", "{": "\\{", "}": "\\}", "&": "\\&", "%": "\\%", "$": "\\$", "#": "\\#", "_": "\\_", "~": "\\textasciitilde{}", "^": "\\textasciicircum{}" };
const bibEscape = (s: string) => s.replace(/[\\{}&%$#_~^]/g, (ch) => BIB_ESCAPES[ch]);

export function bibtexKey(c: CitationData): string {
  const first = c.authors[0];
  const who = first ? (first.isOrganization ? first.name : nameParts(first).family) : "anon";
  const word = (c.title || "").split(/\s+/).find((w) => w.replace(/\W/g, "").length > 3) || "";
  const { y } = parseDateParts(c.publishedDate);
  return `${who}${y ?? ""}${word}`.normalize("NFD").replace(/[^A-Za-z0-9]/g, "").toLowerCase() || "cite";
}

export function formatBibTeX(c: CitationData, accessed?: string): string {
  const { y, m, d } = parseDateParts(c.publishedDate);
  const type = c.sourceType === "journal-article" || c.sourceType === "news-article" ? "article" : c.sourceType === "book" ? "book" : c.sourceType === "report" ? "techreport" : "misc";
  const fields: [string, string | undefined][] = [
    ["author", c.authors.length ? c.authors.map((a) => (a.isOrganization ? `{${bibEscape(a.name)}}` : bibEscape(fullName(a, true)))).join(" and ") : undefined],
    ["title", c.title && bibEscape(c.title)],
    [type === "article" ? "journal" : "booktitle", type === "misc" ? undefined : c.containerTitle && bibEscape(c.containerTitle)],
    ["publisher", (c.publisher || (type === "misc" ? c.containerTitle : undefined)) && bibEscape((c.publisher || c.containerTitle)!)],
    ["year", y ? String(y) : undefined],
    ["month", m ? MONTHS[m - 1].slice(0, 3).toLowerCase() : undefined],
    ["day", d ? String(d) : undefined],
    ["volume", c.volume && bibEscape(c.volume)],
    ["number", c.issue && bibEscape(c.issue)],
    ["pages", c.pages && c.pages.replace(/[–—-]+/g, "--")],
    ["doi", c.doi],
    ["url", c.url],
    ["urldate", accessed],
  ];
  const lines = fields
    .filter(([, v]) => v)
    .map(([k, v]) => {
      // `month` is a bare macro (mar), everything else is braced.
      return `  ${k} = ${k === "month" ? v : `{${v}}`}`;
    });
  return `@${type}{${bibtexKey(c)},\n${lines.join(",\n")}\n}`;
}

const escapeHTML = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Italic markers → nothing, or `<i>` once the rest is escaped. */
function render(marked: string): FormattedCitation {
  const text = marked.split(I0).join("").split(I1).join("").replace(/\s+/g, (ws) => (ws.includes("\n") ? ws : " ")).trim();
  const html = escapeHTML(marked).split(I0).join("<i>").split(I1).join("</i>").replace(/[ \t]+/g, " ").trim();
  return { text, html: html.replace(/\n/g, "<br>") };
}

/**
 * Writes `citation` in one style. `accessedDate` (ISO) defaults to the one on
 * the citation; styles that print an access date use it when the page is undated.
 */
export function formatCitation(citation: CitationData, style: CitationStyle): FormattedCitation {
  const accessed = citation.accessedDate;
  switch (style) {
    case "apa":
      return render(formatAPA(citation));
    case "mla":
      return render(formatMLA(citation));
    case "chicago":
      return render(formatChicago(citation, accessed));
    case "harvard":
      return render(formatHarvard(citation, accessed));
    case "ieee":
      return render(formatIEEE(citation, accessed));
    case "bibtex": {
      const text = formatBibTeX(citation, accessed);
      return { text, html: escapeHTML(text).replace(/\n/g, "<br>") };
    }
  }
}

/** Every requested style at once. */
export function formatCitations(
  citation: CitationData,
  styles: CitationStyle[] = [...CITATION_STYLES]
): Partial<Record<CitationStyle, FormattedCitation>> {
  return Object.fromEntries(styles.map((style) => [style, formatCitation(citation, style)]));
}
