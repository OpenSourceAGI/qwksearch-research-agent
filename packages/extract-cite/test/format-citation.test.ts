import { describe, expect, it } from "vitest";
import { bibtexKey, formatCitation, formatCitations } from "../src/llm/format-citation";
import { clipText, preparePage } from "../src/llm/page-text";
import { appearsIn, normalizeDate } from "../src/llm/parse-reply";
import { CITATION_STYLES, type CitationAuthor, type CitationData } from "../src/llm/types";

const person = (given: string, family: string): CitationAuthor => ({
  name: `${given} ${family}`, given, family, isOrganization: false, confidence: 1,
});
const org = (name: string): CitationAuthor => ({ name, isOrganization: true, confidence: 1 });

const news: CitationData = {
  sourceType: "news-article",
  authors: [person("Maria", "Santos"), person("Jean-Paul", "Okafor")],
  title: "Oceans Hit Record Heat",
  containerTitle: "The New York Times",
  publishedDate: "2024-03-05",
  url: "https://www.nytimes.com/2024/03/05/x.html",
  accessedDate: "2026-10-05",
};
const journal: CitationData = {
  sourceType: "journal-article",
  authors: [person("Ann", "Lee"), person("Bo", "Chan"), person("Cy", "Diaz")],
  title: "Deep learning for X",
  containerTitle: "Nature",
  volume: "12", issue: "3", pages: "45-67",
  publishedDate: "2023-06",
  doi: "10.1038/abc123",
  accessedDate: "2026-10-05",
};
const undated: CitationData = {
  sourceType: "webpage", authors: [], title: "Web scraping", containerTitle: "Wikipedia",
  url: "https://en.wikipedia.org/wiki/Web_scraping", accessedDate: "2026-10-05",
};
const who: CitationData = {
  sourceType: "webpage", authors: [org("World Health Organization")],
  title: "Climate change and health", containerTitle: "World Health Organization",
  publishedDate: "2023-10-12", url: "https://www.who.int/x", accessedDate: "2026-10-05",
};

const text = (c: CitationData, s: (typeof CITATION_STYLES)[number]) => formatCitation(c, s).text;

describe("APA 7", () => {
  it("news article: authors, full date, plain title, italic site", () => {
    expect(text(news, "apa")).toBe(
      "Santos, M., & Okafor, J.-P. (2024, March 5). Oceans Hit Record Heat. The New York Times. https://www.nytimes.com/2024/03/05/x.html"
    );
    expect(formatCitation(news, "apa").html).toContain("<i>The New York Times</i>");
  });
  it("journal article: year only, italic volume, DOI link", () => {
    expect(text(journal, "apa")).toBe(
      "Lee, A., Chan, B., & Diaz, C. (2023). Deep learning for X. Nature, 12(3), 45-67. https://doi.org/10.1038/abc123"
    );
  });
  it("group author who is also the site is not repeated", () => {
    expect(text(who, "apa")).toBe(
      "World Health Organization. (2023, October 12). Climate change and health. https://www.who.int/x"
    );
  });
  it("undated, authorless page: title leads, n.d., retrieval date", () => {
    expect(text(undated, "apa")).toBe(
      "Web scraping. (n.d.). Wikipedia. Retrieved October 5, 2026, from https://en.wikipedia.org/wiki/Web_scraping"
    );
  });
  it("lists 21+ authors as 19, an ellipsis and the last", () => {
    const many = { ...news, authors: Array.from({ length: 22 }, (_, i) => person("A", `Name${i}`)) };
    const out = text(many, "apa");
    expect(out).toContain("Name18, A., . . . Name21, A.");
    expect(out).not.toContain("Name19");
  });
});

describe("MLA 9", () => {
  it("two authors, quoted title, abbreviated month, no protocol", () => {
    expect(text(news, "mla")).toBe(
      "Santos, Maria, and Jean-Paul Okafor. “Oceans Hit Record Heat.” The New York Times, 5 Mar. 2024, www.nytimes.com/2024/03/05/x.html."
    );
  });
  it("three or more authors become et al.", () => {
    expect(text(journal, "mla")).toBe(
      "Lee, Ann, et al. “Deep learning for X.” Nature, vol. 12, no. 3, June 2023, pp. 45-67, https://doi.org/10.1038/abc123."
    );
  });
});

describe("Chicago", () => {
  it("news article", () => {
    expect(text(news, "chicago")).toBe(
      "Santos, Maria, and Jean-Paul Okafor. “Oceans Hit Record Heat.” The New York Times, March 5, 2024. https://www.nytimes.com/2024/03/05/x.html."
    );
  });
  it("journal article", () => {
    expect(text(journal, "chicago")).toBe(
      "Lee, Ann, Bo Chan, and Cy Diaz. “Deep learning for X.” Nature 12, no. 3 (2023): 45-67. https://doi.org/10.1038/abc123."
    );
  });
  it("undated page gets an access date", () => {
    expect(text(undated, "chicago")).toContain("Accessed October 5, 2026.");
  });
});

describe("Harvard and IEEE", () => {
  it("Harvard", () => {
    expect(text(news, "harvard")).toBe(
      "Santos, M. and Okafor, J.-P. (2024) ‘Oceans Hit Record Heat’, The New York Times, 5 March. Available at: https://www.nytimes.com/2024/03/05/x.html (Accessed: 5 October 2026)."
    );
  });
  it("IEEE", () => {
    expect(text(journal, "ieee")).toBe(
      "A. Lee, B. Chan, and C. Diaz, “Deep learning for X,” Nature, vol. 12, no. 3, pp. 45-67, Jun. 2023, doi: 10.1038/abc123."
    );
    expect(text(undated, "ieee")).toContain("Wikipedia, n.d. [Online]");
  });
});

describe("BibTeX", () => {
  it("writes an @article with escaped specials and an en-dash page range", () => {
    const out = text({ ...journal, title: "Cats & Dogs: 100% Real" }, "bibtex");
    expect(out).toMatch(/^@article\{lee2023cats,/);
    expect(out).toContain("title = {Cats \\& Dogs: 100\\% Real}");
    expect(out).toContain("pages = {45--67}");
    expect(out).toContain("author = {Lee, Ann and Chan, Bo and Diaz, Cy}");
  });
  it("braces group authors so they are not inverted", () => {
    expect(text(who, "bibtex")).toContain("author = {{World Health Organization}}");
  });
  it("builds a stable key", () => {
    expect(bibtexKey(news)).toBe("santos2024oceans");
  });
});

describe("rendering", () => {
  it("escapes HTML in values", () => {
    const out = formatCitation({ ...news, title: '<img src=x onerror=alert(1)> "x"' }, "apa");
    expect(out.html).not.toContain("<img");
    expect(out.html).toContain("&lt;img");
    expect(out.text).toContain("<img");
  });
  it("writes every style by default and only the ones asked for", () => {
    expect(Object.keys(formatCitations(news)).sort()).toEqual([...CITATION_STYLES].sort());
    expect(Object.keys(formatCitations(news, ["apa", "mla"]))).toEqual(["apa", "mla"]);
  });
  it("survives a citation with nothing but a URL", () => {
    const bare: CitationData = { sourceType: "webpage", authors: [], url: "https://a.example/x" };
    for (const style of CITATION_STYLES) expect(() => formatCitation(bare, style)).not.toThrow();
  });
});

describe("helpers", () => {
  it("normalizeDate keeps real dates at their precision and drops bad ones", () => {
    expect(normalizeDate("2024-03-05T10:00:00Z")).toBe("2024-03-05");
    expect(normalizeDate("2024-03")).toBe("2024-03");
    expect(normalizeDate("2024")).toBe("2024");
    expect(normalizeDate("2024-02-31")).toBeUndefined();
    expect(normalizeDate("2024-13-01")).toBeUndefined();
    expect(normalizeDate("1200")).toBeUndefined();
    expect(normalizeDate("March 5")).toBeUndefined();
  });
  it("appearsIn ignores case, punctuation and spacing", () => {
    expect(appearsIn("Jean-Paul Okafor", "by JEAN PAUL  okafor")).toBe(true);
    expect(appearsIn("Zed", "Maria Santos")).toBe(false);
    expect(appearsIn("", "anything")).toBe(false);
  });
  it("clipText keeps the head and the tail of long text", () => {
    const long = "a".repeat(100) + "b".repeat(100);
    const out = clipText(long, 40);
    expect(out.startsWith("a".repeat(30))).toBe(true);
    expect(out.endsWith("b".repeat(10))).toBe(true);
    expect(clipText("short", 40)).toBe("short");
  });
  it("preparePage keeps citation meta and JSON-LD and drops scripts", () => {
    const page = preparePage(
      `<html><head><title>T</title><meta name="citation_doi" content="10.1/x"><meta name="viewport" content="w">
       <script type="application/ld+json">{"a":1}</script></head><body><script>var x=1</script><p>Hello   world</p></body></html>`
    );
    expect(page.meta).toContain("citation_doi: 10.1/x");
    expect(page.meta).not.toContain("viewport");
    expect(page.jsonLd).toBe('{"a":1}');
    expect(page.text).toBe("Hello world");
  });
});
