import { describe, expect, it } from "vitest"
import { hostnameFromUrl, isBookmarkNode, titleOrHostname } from "../lib/bookmarks"

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

describe("isBookmarkNode", () => {
  it("returns true for a node with a url", () => {
    expect(isBookmarkNode({ title: "Example", url: "https://example.com" })).toBe(true)
  })

  it("returns false for a folder node with no url", () => {
    expect(isBookmarkNode({ title: "My Folder" })).toBe(false)
  })

  it("returns false for a node with an empty-string url", () => {
    expect(isBookmarkNode({ title: "Odd node", url: "" })).toBe(false)
  })
})
