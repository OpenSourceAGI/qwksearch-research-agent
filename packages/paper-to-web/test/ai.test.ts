import { describe, expect, it, vi } from "vitest"
import { enhancePaperWithAi, enhanceSectionWithAi, generateOutline, parseJsonReply, type TextGenerator } from "../src/ai"
import { convertToPaper } from "../src/pipeline"
import { stripUnderlines } from "../src/highlight"
import type { PaperSection } from "../src/types"

const section: PaperSection = {
  title: "Original Sin",
  summary: [],
  paragraphs: ["Judges come to the topic garden but doubt the original plan to avoid harm.", "### Sub", "The root issue is supposing we know good and evil."],
}

const reply = (body: unknown): TextGenerator => vi.fn(async () => `Here you go:\n\`\`\`json\n${JSON.stringify(body)}\n\`\`\``)

describe("parseJsonReply", () => {
  it("reads fenced and bare JSON", () => {
    expect(parseJsonReply<{ a: number }>('```json\n{"a":1}\n```')).toEqual({ a: 1 })
    expect(parseJsonReply<{ a: number }>('Sure. {"a":2} done')).toEqual({ a: 2 })
    expect(() => parseJsonReply("no json")).toThrow()
  })
})

describe("enhanceSectionWithAi", () => {
  it("applies verbatim underlines only, keeps the prose and skips subheadings", async () => {
    const generate = reply({
      description: "Doubt is the temptation.",
      summary: [{ label: "Eve's warrant:", text: "Judges doubt the plan." }],
      underlines: [["Judges come to the topic garden", "invented phrase"], ["Sub"], ["The root issue is supposing we know good and evil"]],
    })
    const out = await enhanceSectionWithAi(section, generate, "Paper")
    expect(out.description).toBe("Doubt is the temptation.")
    expect(out.summary).toEqual([{ label: "Eve's warrant", text: "Judges doubt the plan." }])
    expect(out.paragraphs).toEqual([
      "==Judges come to the topic garden== but doubt the original plan to avoid harm.",
      "### Sub",
      "==The root issue is supposing we know good and evil==.",
    ])
    expect(out.paragraphs.map(stripUnderlines)).toEqual(section.paragraphs)
    expect(vi.mocked(generate).mock.calls[0][0]).toContain("[1] Judges come to the topic garden")
  })
})

describe("enhancePaperWithAi", () => {
  it("falls back to the offline pass for a section whose reply is bad", async () => {
    const generate: TextGenerator = async () => "not json"
    const paper = await enhancePaperWithAi({ title: "T", sections: [section], references: [] }, generate)
    expect(paper.sections[0].description).toBeTruthy()
  })
})

describe("generateOutline", () => {
  const outline = {
    title: "Vote Synergy",
    description: "Theory and action together",
    abstract: { text: "Critiques are lenses, not gateways.", underlines: ["Critiques are lenses"] },
    keywords: ["fiat"],
    sections: [
      {
        part: "Part I. The Standard",
        title: "Concerned Readers",
        description: "Readers facing harm decide.",
        summary: [{ label: "Standard", text: "Ask what a concerned reader would do." }],
        paragraphs: [{ text: "A concerned reader would weigh {real} outcomes first.", underlines: ["A concerned reader would weigh {real} outcomes"] }, "Plain paragraph string."],
      },
      { title: "", paragraphs: [{ text: "dropped: no title" }] },
    ],
    references: ["Smith, A. 2020. Book."],
  }

  it("builds a paper from the model's outline, escaping MDX and applying underlines", async () => {
    const paper = await generateOutline("critiques in policy debate", reply(outline))
    expect(paper.title).toBe("Vote Synergy")
    expect(paper.abstract).toBe("==Critiques are lenses==, not gateways.")
    expect(paper.sections).toHaveLength(1)
    expect(paper.sections[0].part).toBe("Part I. The Standard")
    expect(paper.sections[0].paragraphs[0]).toBe("==A concerned reader would weigh \\{real\\} outcomes== first.")
    expect(paper.references).toEqual(["Smith, A. 2020. Book."])
  })

  it("asks for an original outline for a topic and a faithful one for a source", async () => {
    const topic = reply(outline)
    await generateOutline("critiques in policy debate", topic)
    expect(vi.mocked(topic).mock.calls[0][0]).toContain("Topic: critiques in policy debate")
    const source = reply(outline)
    await generateOutline({ title: "Src", sections: [section], references: [] }, source, { focus: "aff" })
    expect(vi.mocked(source).mock.calls[0][0]).toMatch(/<source>[\s\S]*## Original Sin[\s\S]*Outline this source faithfully[\s\S]*Focus: aff/)
  })

  it("rejects an outline with no sections", async () => {
    await expect(generateOutline("topic", reply({ title: "x", sections: [] }))).rejects.toThrow(/no sections/)
  })
})

describe("convertToPaper", () => {
  const text = "# Case\n\n## Harms\n\nThe status quo fails every student who wants to debate because coaches are scarce and travel costs are high."

  it("paper mode without a model runs the offline pass", async () => {
    const paper = await convertToPaper(text)
    expect(paper.sections[0].paragraphs[0]).toContain("==")
    expect(paper.sections[0].summary.length).toBeGreaterThan(0)
  })

  it("outline mode without a model keeps only the underlined words", async () => {
    const paper = await convertToPaper(text, { mode: "outline" })
    expect(paper.sections[0].paragraphs).toEqual(["==The status quo fails every student who wants to debate because coaches are scarce and travel costs=="])
  })

  it("outline mode with a model sends pasted text straight to the outline", async () => {
    const generate = reply({ title: "O", sections: [{ title: "S", summary: [{ label: "a", text: "b" }], paragraphs: ["p"] }] })
    const extract = vi.fn()
    const paper = await convertToPaper(text, { mode: "outline", generate, extract })
    expect(paper.title).toBe("O")
    expect(extract).not.toHaveBeenCalled()
  })
})
