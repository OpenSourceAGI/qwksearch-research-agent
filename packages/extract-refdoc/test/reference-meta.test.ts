import { describe, expect, it } from "vitest"
import {
  analyzeReference,
  classifySource,
  condenseQualification,
  formatAuthorsDisplay,
  isInstitutionName,
  isQualifiedText,
  looksLikeQualifications,
  parseCitationAuthors,
  parseTagAuthors,
  shortYear,
} from "../src/reference-meta"

const GALLOWAY_CITATION = 'Galloway, Ryan. "Go Vegetarian." Wyoming Debate Roundup, March 27, 2020. bit.ly/4d5Kyh9.'
const GALLOWAY_QUALS = "Ryan Galloway is a longtime college debate coach who directed debate at Samford University and writes on debate theory."
const HANSSON_CITATION = 'Hansson, Sven Ove, and Sanne Reijven. 2025. "Debating Risk." *Journal of Applied Philosophy* 42 (3): 301–320. https://doi.org/10.1111/japp.12345.'

describe("analyzeReference", () => {
  it("formats the Galloway card", () => {
    const meta = analyzeReference({ citation: GALLOWAY_CITATION, tag: "Galloway (2020)", qualifications: GALLOWAY_QUALS })
    expect(meta).toEqual({
      type: "blog",
      isQualified: true,
      isInstitution: false,
      authorsDisplay: "Galloway",
      yearShort: "'20",
      qualification: "longtime college debate coach at Samford University",
      authorLine: "Galloway '20 — longtime college debate coach at Samford University",
    })
  })

  it("reads the author and year from the citation when there is no tag", () => {
    const meta = analyzeReference(GALLOWAY_CITATION)
    expect(meta.authorsDisplay).toBe("Galloway")
    expect(meta.yearShort).toBe("'20")
    expect(meta.authorLine).toBe("Galloway '20")
  })

  it("joins two authors with an ampersand (Hansson & Reijven 2025)", () => {
    const fromTag = analyzeReference({ citation: HANSSON_CITATION, tag: "Hansson & Reijven (2025)", qualifications: "Sven Ove Hansson is a professor of philosophy at KTH Royal Institute of Technology." })
    expect(fromTag.authorsDisplay).toBe("Hansson & Reijven")
    expect(fromTag.yearShort).toBe("'25")
    expect(fromTag.type).toBe("journal")
    expect(fromTag.isQualified).toBe(true)
    expect(fromTag.qualification).toBe("professor of philosophy at KTH Royal Institute of Technology")
    expect(fromTag.authorLine).toBe("Hansson & Reijven '25 — professor of philosophy at KTH Royal Institute of Technology")
    const fromCitation = analyzeReference(HANSSON_CITATION)
    expect(fromCitation.authorsDisplay).toBe("Hansson & Reijven")
    expect(fromCitation.authorLine).toBe("Hansson & Reijven '25")
  })

  it("keeps an institutional author's full name and flags it", () => {
    const meta = analyzeReference({ citation: "Brookings Institution. 2021. *Rethinking Trade Policy*. Washington, DC: Brookings Institution Press.", tag: "Brookings (2021)" })
    expect(meta.isInstitution).toBe(true)
    expect(meta.authorsDisplay).toBe("Brookings")
    const noTag = analyzeReference("World Health Organization. 2020. Global Report on Infection Prevention. Geneva: WHO.")
    expect(noTag.isInstitution).toBe(true)
    expect(noTag.authorLine).toBe("World Health Organization '20")
    expect(noTag.type).toBe("report")
  })

  it("does not take a title as the author", () => {
    const meta = analyzeReference("Attention is all you need. NeurIPS 2017.")
    expect(meta.authorsDisplay).toBe("")
    expect(meta.authorLine).toBe("")
  })
})

describe("author names", () => {
  it("shows one, two, and three or more authors", () => {
    expect(formatAuthorsDisplay(["Galloway"])).toBe("Galloway")
    expect(formatAuthorsDisplay(["Hansson", "Reijven"])).toBe("Hansson & Reijven")
    expect(formatAuthorsDisplay(["Hansson", "Reijven", "Lee"])).toBe("Hansson et al.")
    expect(formatAuthorsDisplay(["Hansson"], true)).toBe("Hansson et al.")
    expect(formatAuthorsDisplay(["Hansson", "Reijven"], true)).toBe("Hansson et al.")
    expect(formatAuthorsDisplay([])).toBe("")
  })

  it("reads tag authors", () => {
    expect(parseTagAuthors("Galloway (2020)")?.names).toEqual(["Galloway"])
    expect(parseTagAuthors("Hansson & Reijven")?.names).toEqual(["Hansson", "Reijven"])
    expect(parseTagAuthors("Hansson, Reijven and Lee")?.names).toEqual(["Hansson", "Reijven", "Lee"])
    expect(parseTagAuthors("Hansson et al. (2025)")).toMatchObject({ names: ["Hansson"], etAl: true })
  })

  it("reads Chicago and APA author lists", () => {
    expect(parseCitationAuthors(HANSSON_CITATION)?.names).toEqual(["Hansson", "Reijven"])
    expect(parseCitationAuthors('Smith, John, Jane Doe, and Bob van der Berg. 2019. "Title." *J.*')?.names).toEqual(["Smith", "Doe", "van der Berg"])
    expect(parseCitationAuthors("Smith, J., Doe, K., & Lee, B. (2019). Title.")?.names).toEqual(["Smith", "Doe", "Lee"])
    expect(parseCitationAuthors("Smith, J. A., et al. 2019. Title.")).toMatchObject({ names: ["Smith"], etAl: true })
    expect(parseCitationAuthors("Shanahan, William. 1993. *Kritik of Thinking*.")?.names).toEqual(["Shanahan"])
  })

  it("detects institutions", () => {
    for (const name of ["Brookings Institution", "Harvard University", "Center for American Progress", "Bureau of Labor Statistics", "United Nations Development Programme Council", "National Education Association", "Pew Research Center", "Acme Inc.", "WHO", "IPCC", "RAND Europe", "House Committee on Ways and Means", "Federal Reserve Bank", "World Health Organization (WHO)", "U.S. Department of State"]) {
      expect(isInstitutionName(name), name).toBe(true)
    }
    for (const name of ["Galloway", "Galloway, Ryan", "Sanne Reijven", "JD Vance", "Hansson", "Smith III"]) {
      expect(isInstitutionName(name), name).toBe(false)
    }
  })
})

describe("year", () => {
  it("ticks the last two digits", () => {
    expect(shortYear("2020")).toBe("'20")
    expect(shortYear("1999")).toBe("'99")
    expect(shortYear("2020a")).toBe("'20a")
    expect(shortYear("n.d.")).toBe("")
    expect(shortYear("")).toBe("")
  })
})

describe("qualifications", () => {
  it("drops the author's name and the extra clauses", () => {
    expect(condenseQualification(GALLOWAY_QUALS, ["Galloway"])).toBe("longtime college debate coach at Samford University")
    expect(condenseQualification("Jane Doe is a Professor of History at Harvard.", ["Doe"])).toBe("Professor of History at Harvard")
    expect(condenseQualification("Dr. Jane Doe is the Director of Policy at the Urban Institute, where she studies housing. She previously served in the Senate.", ["Doe"])).toBe("Director of Policy at the Urban Institute")
    expect(condenseQualification("Jane Doe, Professor of History at Harvard", ["Doe"])).toBe("Professor of History at Harvard")
    expect(condenseQualification("Professor of History at Harvard")).toBe("Professor of History at Harvard")
    expect(condenseQualification("")).toBe("")
  })

  it("finds the qualifications sentence among a card's lines", () => {
    expect(looksLikeQualifications(GALLOWAY_QUALS, ["Galloway"])).toBe(true)
    expect(looksLikeQualifications("States counterplans that fiat uniform action distort the literature base.", ["Galloway"])).toBe(false)
  })

  it("flags credentials", () => {
    for (const text of ["Professor of History at Harvard", "Ph.D. in economics", "Dr. Jane Doe", "longtime college debate coach", "Senior Fellow at Brookings", "Director of Debate"]) {
      expect(isQualifiedText(text), text).toBe(true)
    }
    expect(isQualifiedText("a Substack writer")).toBe(false)
  })
})

describe("classifySource", () => {
  const cases: Array<[string, string]> = [
    [GALLOWAY_CITATION, "blog"],
    ['Doe, Jane. "Why Not." *Substack* (blog), 2021. https://doe.substack.com/p/why-not.', "blog"],
    ['Doe, Jane. "On Policy." Medium, May 1, 2021. https://medium.com/@doe/on-policy.', "blog"],
    [HANSSON_CITATION, "journal"],
    ['Doe, Jane. 2019. "Title." *American Political Science Review* 113, no. 2: 100–120.', "journal"],
    ['Doe, Jane. 2019. "Title." *Nature* 12 (3).', "journal"],
    ['Doe, Jane. 2019. *Title of Book*. Cambridge, MA: Harvard University Press.', "book"],
    ['Doe, Jane. 2019. *Title of Book*. New York: Basic Books. ISBN 978-0-465-00000-0.', "book"],
    ['Doe, Jane. "Chapter." In *Handbook of Debate*, edited by John Roe, 33–50. Oxford: Oxford University Press, 2018.', "chapter"],
    ['Doe, Jane. "Why Not." YouTube video, 12:04. https://www.youtube.com/watch?v=abc.', "video"],
    ['Doe, Jane. "A Talk." Vimeo, 2020. https://vimeo.com/123.', "video"],
    ['Doe, Jane. "Senate Votes." *New York Times*, June 3, 2020. https://www.nytimes.com/2020/06/03/x.html.', "news"],
    ['Doe, Jane. "Senate Votes." Reuters, June 3, 2020.', "news"],
    ["Pew Research Center. 2020. Policy Brief on Housing. Washington, DC.", "report"],
    ['Doe, Jane. 2020. "Title." SSRN Working Paper.', "report"],
    ['Doe, Jane. "About Us." Example Org, 2020. https://example.org/about.', "web"],
    ["Attention is all you need.", "unknown"],
    ["", "unknown"],
  ]
  it.each(cases)("%s → %s", (citation, type) => {
    expect(classifySource(citation)).toBe(type)
  })
})
