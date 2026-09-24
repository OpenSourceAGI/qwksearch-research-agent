import { describe, expect, it } from "vitest"
import { formatLastVisit, hostnameFromUrl, titleOrHostname } from "../lib/history"

describe("hostnameFromUrl", () => {
  it("returns the hostname for a well-formed URL", () => {
    expect(hostnameFromUrl("https://example.com/path?q=1")).toBe("example.com")
  })

  it("returns the input unchanged when it doesn't parse as a URL", () => {
    expect(hostnameFromUrl("not a url")).toBe("not a url")
  })
})

describe("titleOrHostname", () => {
  it("returns the trimmed title when present", () => {
    expect(titleOrHostname({ title: "  Example Site  ", url: "https://example.com" })).toBe(
      "Example Site"
    )
  })

  it("falls back to the hostname when the title is blank", () => {
    expect(titleOrHostname({ title: "   ", url: "https://example.com/path" })).toBe(
      "example.com"
    )
  })

  it("falls back to the hostname when the title is missing", () => {
    expect(titleOrHostname({ url: "https://example.com" })).toBe("example.com")
  })

  it("returns an empty string when neither title nor url is present", () => {
    expect(titleOrHostname({})).toBe("")
  })
})

describe("formatLastVisit", () => {
  const now = 1_700_000_000_000

  it("returns an empty string when lastVisitTime is missing", () => {
    expect(formatLastVisit(undefined, now)).toBe("")
  })

  it("reports Just now for a visit within the last minute", () => {
    expect(formatLastVisit(now - 30_000, now)).toBe("Just now")
  })

  it("reports minutes ago for a visit within the last hour", () => {
    expect(formatLastVisit(now - 5 * 60_000, now)).toBe("5m ago")
  })

  it("reports hours ago for a visit within the last day", () => {
    expect(formatLastVisit(now - 3 * 60 * 60_000, now)).toBe("3h ago")
  })

  it("reports days ago for a visit within the last week", () => {
    expect(formatLastVisit(now - 2 * 24 * 60 * 60_000, now)).toBe("2d ago")
  })

  it("falls back to a locale date string for a visit over a week ago", () => {
    const lastVisitTime = now - 8 * 24 * 60 * 60_000
    expect(formatLastVisit(lastVisitTime, now)).toBe(new Date(lastVisitTime).toLocaleDateString())
  })
})
