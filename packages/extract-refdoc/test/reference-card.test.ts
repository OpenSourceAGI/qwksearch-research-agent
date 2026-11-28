// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { groupReferenceEntries, parseCardHeader, parseReferenceEntry, referenceCardHtml, referenceFlags } from "../src/reference-card"
import { paperToRefdocDocument } from "../src/refdoc"
import type { Paper } from "../src/types"

const HEADER = '23Galloway (2020)Galloway, Ryan. "Go Vegetarian." Wyoming Debate Roundup, March 27, 2020. bit.ly/4d5Kyh9.'
const SUMMARY = "States counterplans that fiat uniform action distort the literature base."
const QUOTE =
  "the states counterplan thrives by distorting the literature base to answer it [...] " +
  "==that is the problem== with fiat. ".repeat(20) +
  "[N]ot even the notion that something is currently considered illegal is stable."
const SOURCE = "*This post criticizes the states counterplan, arguing that uniform fiat distorts the literature.*"
const QUALS = "Ryan Galloway is a longtime college debate coach who directed debate at Samford University and writes on debate theory."
const EXCERPT = "the states counterplan thrives by distorting the literature base to answer it [...] [N]ot even the notion that something is currently consi"
const GALLOWAY = [HEADER, SUMMARY, QUOTE, SOURCE, QUALS, EXCERPT].join("\n")

describe("parseCardHeader", () => {
  it("splits the number, the tag and the citation", () => {
    expect(parseCardHeader(HEADER)).toEqual({
      number: "23",
      tag: "Galloway (2020)",
      citation: 'Galloway, Ryan. "Go Vegetarian." Wyoming Debate Roundup, March 27, 2020. bit.ly/4d5Kyh9.',
    })
    expect(parseCardHeader('Hansson & Reijven (2025)Hansson, Sven Ove, and Sanne Reijven. 2025. "Debating Risk." *J. Phil.* 1 (1).')).toMatchObject({ number: undefined, tag: "Hansson & Reijven (2025)" })
  })

  it("leaves plain citations and prose alone", () => {
    expect(parseCardHeader("Shanahan, William. 1993. *Kritik of Thinking*.")).toBeNull()
    expect(parseCardHeader("Smith (2020) argues that critiques fail.")).toBeNull()
    expect(parseCardHeader("Smith, J. (2020). Title of work.")).toBeNull()
  })
})

describe("parseReferenceEntry", () => {
  it("takes the Galloway card apart and drops the original-source and repeated excerpt", () => {
    const card = parseReferenceEntry(GALLOWAY)
    expect(card.number).toBe("23")
    expect(card.summary).toBe(SUMMARY)
    expect(card.qualifications).toBe(QUALS)
    expect(card.cardText).toEqual([QUOTE])
  })

  it("accepts a card whose lines are separated by blank lines", () => {
    expect(parseReferenceEntry(GALLOWAY.replace(/\n/g, "\n\n")).cardText).toEqual([QUOTE])
  })

  it("keeps a plain citation as a citation", () => {
    const card = parseReferenceEntry("Shanahan, William. 1993. *Kritik of Thinking*.")
    expect(card).toEqual({ citation: "Shanahan, William. 1993. *Kritik of Thinking*.", cardText: [] })
  })

  it("keeps several card text paragraphs together", () => {
    const card = parseReferenceEntry([HEADER, SUMMARY, QUOTE, `${QUOTE} second paragraph`, QUALS].join("\n"))
    expect(card.cardText).toHaveLength(2)
    expect(card.summary).toBe(SUMMARY)
  })
})

describe("groupReferenceEntries", () => {
  it("joins a card's lines when they arrive as separate entries", () => {
    const grouped = groupReferenceEntries([HEADER, SUMMARY, QUOTE, SOURCE, QUALS, EXCERPT, "Shanahan, William. 1993. *Kritik of Thinking*."])
    expect(grouped).toHaveLength(2)
    expect(grouped[0]).toBe(GALLOWAY.replace(/\n/g, "\n"))
    expect(grouped[1]).toBe("Shanahan, William. 1993. *Kritik of Thinking*.")
  })

  it("does not merge plain references", () => {
    const plain = ["Shanahan, William. 1993. *Kritik of Thinking*.", "Bodnick, Marc. 2023. High School Debate Is Broken."]
    expect(groupReferenceEntries(plain)).toEqual(plain)
  })
})

describe("referenceCardHtml", () => {
  const html = referenceCardHtml(GALLOWAY, "ref-1")
  const doc = new DOMParser().parseFromString(`<ol>${html}</ol>`, "text/html")
  const li = doc.querySelector("li")!

  it("lays out summary, author line, citation, then collapsed card text", () => {
    expect(li.id).toBe("ref-1")
    const order = Array.from(li.children).map((el) => el.className)
    expect(order.slice(0, 4)).toEqual(["refdoc-ref-summary", "refdoc-ref-author", "refdoc-ref-citation", "refdoc-ref-text"])
    expect(li.querySelector(".refdoc-ref-summary")?.textContent).toBe(SUMMARY)
    expect(li.querySelector(".refdoc-ref-author")?.textContent).toBe("Galloway '20 — longtime college debate coach at Samford University")
    expect(li.querySelector(".refdoc-ref-citation")?.textContent).toBe('Galloway, Ryan. "Go Vegetarian." Wyoming Debate Roundup, March 27, 2020. bit.ly/4d5Kyh9.')
  })

  it("collapses only the card text, closed by default", () => {
    const details = li.querySelectorAll("details")
    expect(details).toHaveLength(1)
    expect(details[0].hasAttribute("open")).toBe(false)
    expect(details[0].querySelector("summary")?.textContent).toBe("Card text")
    expect(details[0].querySelector("mark.debate-hl")).not.toBeNull()
  })

  it("does not render the original-source paragraph, qualifications sentence or repeated excerpt", () => {
    expect(li.querySelector("em")).toBeNull()
    expect(html).not.toContain("This post criticizes")
    expect(html).not.toContain("Ryan Galloway is a longtime")
    expect(html).not.toContain("currently consi<")
    expect(li.textContent?.match(/the states counterplan thrives/g)).toHaveLength(1)
  })

  it("puts accessible flags on the edge", () => {
    const flags = Array.from(li.querySelectorAll(".refdoc-ref-flags span.refdoc-flag"))
    expect(flags.map((f) => f.getAttribute("data-flag"))).toEqual(["blog", "qualified"])
    expect(flags.map((f) => f.getAttribute("title"))).toEqual(["Blog or post", "Qualified author"])
    expect(flags.every((f) => f.getAttribute("role") === "img" && f.getAttribute("aria-label") && f.querySelector("svg title"))).toBe(true)
    expect(li.getAttribute("data-ref-type")).toBe("blog")
  })

  it("shows an institution flag, distinct from the person flag", () => {
    const institution = referenceCardHtml("Brookings Institution. 2021. *Rethinking Trade Policy*. Washington, DC: Brookings Institution Press.", "ref-2")
    expect(institution).toContain('data-flag="institution"')
    expect(institution).not.toContain('data-flag="qualified"')
    expect(institution).toContain("Brookings Institution '21")
  })

  it("renders a plain citation with an author line and flags", () => {
    const plain = new DOMParser().parseFromString(`<ol>${referenceCardHtml(HANSSON(), "ref-3")}</ol>`, "text/html")
    expect(plain.querySelector(".refdoc-ref-author")?.textContent).toBe("Hansson & Reijven '25")
    expect(plain.querySelector(".refdoc-ref-summary")).toBeNull()
    expect(plain.querySelector("details")).toBeNull()
    expect(Array.from(plain.querySelectorAll(".refdoc-flag")).map((f) => f.getAttribute("data-flag"))).toEqual(["journal"])
  })

  it("adds a card-text status button for evidence cards only", () => {
    const status = li.querySelector("button.refdoc-text-status")!
    expect(status.getAttribute("data-text-status")).toBe("full")
    expect(status.getAttribute("data-ref-key")).toBe("ref-1")
    expect(status.getAttribute("title")).toMatch(/Full card text available/)
    expect(li.getAttribute("data-text-status")).toBe("full")
    expect(new DOMParser().parseFromString(`<ol>${referenceCardHtml(HANSSON(), "ref-9")}</ol>`, "text/html").querySelector(".refdoc-text-status")).toBeNull()
  })

  it("shows the red X for a card with no quoted text and the partial icon for cut-off text", () => {
    const missing = new DOMParser().parseFromString(`<ol>${referenceCardHtml([HEADER, SUMMARY, QUALS].join("\n"), "ref-5")}</ol>`, "text/html")
    const x = missing.querySelector("button.refdoc-text-status")!
    expect(x.getAttribute("data-text-status")).toBe("missing")
    expect(x.getAttribute("aria-label")).toMatch(/missing/i)
    expect(missing.querySelector("details")).toBeNull()
    const partial = new DOMParser().parseFromString(`<ol>${referenceCardHtml([HEADER, SUMMARY, EXCERPT, QUALS].join("\n"), "ref-6")}</ol>`, "text/html")
    expect(partial.querySelector("button.refdoc-text-status")?.getAttribute("data-text-status")).toBe("partial")
  })

  it("has no flags when nothing is known", () => {
    expect(referenceFlags({ type: "unknown", isQualified: false, isInstitution: false })).toEqual([])
    expect(referenceCardHtml("Attention is all you need.", "ref-4")).not.toContain("refdoc-ref-flags")
  })
})

function HANSSON() {
  return 'Hansson, Sven Ove, and Sanne Reijven. 2025. "Debating Risk." *Journal of Applied Philosophy* 42 (3): 301–320. https://doi.org/10.1111/japp.12345.'
}

describe("references page", () => {
  const paper: Paper = {
    title: "Veg",
    sections: [{ title: "Intro", summary: [], paragraphs: ["Counterplans distort the literature [1]."] }],
    references: [HEADER, SUMMARY, QUOTE, SOURCE, QUALS, EXCERPT, HANSSON()],
  }

  it("renders each card on the references page and links citations to the card", () => {
    const refdoc = paperToRefdocDocument(paper)
    const page = refdoc.pages.find((p) => p.slug === "references")!
    const dom = new DOMParser().parseFromString(page.html, "text/html")
    expect(dom.querySelectorAll("ol.refdoc-references > li.refdoc-ref")).toHaveLength(2)
    expect(dom.querySelector("#ref-2 .refdoc-ref-author")?.textContent).toBe("Hansson & Reijven '25")
    const intro = refdoc.pages.find((p) => p.slug !== "" && p.slug !== "references")!
    expect(intro.html).toContain('href="#ref-1"')
    expect(intro.html).toContain('title="Galloway, Ryan. &quot;Go Vegetarian.&quot; Wyoming Debate Roundup')
    expect(intro.html).not.toContain("States counterplans")
  })
})
