import { describe, expect, it } from "vitest"
import { buildSubmissionPayload, CARD_TEXT_MAX_LENGTH, CARD_TEXT_MIN_LENGTH, isSubmitEndpoint, validateCardTextSuggestion } from "../src/card-text-submission"

describe("validateCardTextSuggestion", () => {
  it("refuses empty and whitespace-only text", () => {
    expect(validateCardTextSuggestion("")).toMatch(/paste/i)
    expect(validateCardTextSuggestion("   \n\t")).toMatch(/paste/i)
  })
  it("refuses very short text", () => {
    expect(validateCardTextSuggestion("x".repeat(CARD_TEXT_MIN_LENGTH - 1))).toMatch(/at least/)
    expect(validateCardTextSuggestion("x".repeat(CARD_TEXT_MIN_LENGTH))).toBeNull()
  })
  it("refuses text over the maximum", () => {
    expect(validateCardTextSuggestion("x".repeat(CARD_TEXT_MAX_LENGTH))).toBeNull()
    expect(validateCardTextSuggestion("x".repeat(CARD_TEXT_MAX_LENGTH + 1))).toMatch(/under/)
  })
})

describe("isSubmitEndpoint", () => {
  it("takes http(s) URLs and paths", () => {
    for (const ok of ["https://qwksearch.com/api/card-text-submissions", "http://localhost:3000/api/x", "/api/card-text-submissions"]) expect(isSubmitEndpoint(ok), ok).toBe(true)
  })
  it("refuses everything else", () => {
    for (const bad of ["", "javascript:alert(1)", "data:text/html,x", "ftp://x/y", "//evil.example/x", "api/x", "https://a b", undefined, 3]) expect(isSubmitEndpoint(bad), String(bad)).toBe(false)
  })
})

describe("buildSubmissionPayload", () => {
  it("trims, shortens the label and keeps the honeypot", () => {
    const payload = buildSubmissionPayload({ document: " https://example.com/paper ", documentTitle: " Paper ", reference: "ref-3", referenceLabel: `Galloway '20 —\n${"x".repeat(400)}`, text: "  full text  " })
    expect(payload).toEqual({ document: "https://example.com/paper", documentTitle: "Paper", reference: "ref-3", referenceLabel: payload.referenceLabel, text: "full text", website: "" })
    expect(payload.referenceLabel).toHaveLength(300)
    expect(payload.referenceLabel).not.toContain("\n")
  })
})
