import { describe, expect, it } from "vitest"
import { formatOpenTabsMessage, isContextableTab } from "../lib/open-tabs-context"

describe("isContextableTab", () => {
  it("returns true for an http URL", () => {
    expect(isContextableTab({ url: "http://example.com" })).toBe(true)
  })

  it("returns true for an https URL", () => {
    expect(isContextableTab({ url: "https://example.com" })).toBe(true)
  })

  it("returns false for a chrome:// URL", () => {
    expect(isContextableTab({ url: "chrome://extensions" })).toBe(false)
  })

  it("returns false for a chrome-extension:// URL", () => {
    expect(isContextableTab({ url: "chrome-extension://abc123/popup.html" })).toBe(false)
  })

  it("returns false for an about: URL", () => {
    expect(isContextableTab({ url: "about:blank" })).toBe(false)
  })

  it("returns false for a file:// URL", () => {
    expect(isContextableTab({ url: "file:///Users/me/notes.txt" })).toBe(false)
  })

  it("returns false when the URL is missing", () => {
    expect(isContextableTab({ title: "New Tab" })).toBe(false)
  })

  it("returns false when the URL is an empty string", () => {
    expect(isContextableTab({ url: "" })).toBe(false)
  })
})

describe("formatOpenTabsMessage", () => {
  it("returns undefined when there are no tabs", () => {
    expect(formatOpenTabsMessage([])).toBeUndefined()
  })

  it("returns undefined when no tabs are contextable", () => {
    expect(
      formatOpenTabsMessage([{ url: "chrome://extensions" }, { url: "about:blank" }])
    ).toBeUndefined()
  })

  it("numbers and formats contextable tabs with title and URL", () => {
    const message = formatOpenTabsMessage([
      { title: "Example Site", url: "https://example.com/path" },
      { title: "Another Site", url: "https://another.example.com" },
    ])

    expect(message).toBe(
      [
        "Here are my currently open browser tabs:",
        "1. Example Site — https://example.com/path",
        "2. Another Site — https://another.example.com",
        "",
        "Please use these as context for my next questions.",
      ].join("\n")
    )
  })

  it("falls back to the hostname when a tab's title is blank", () => {
    const message = formatOpenTabsMessage([{ title: "   ", url: "https://example.com/path" }])

    expect(message).toBe(
      [
        "Here are my currently open browser tabs:",
        "1. example.com — https://example.com/path",
        "",
        "Please use these as context for my next questions.",
      ].join("\n")
    )
  })

  it("falls back to the hostname when a tab's title is missing", () => {
    const message = formatOpenTabsMessage([{ url: "https://example.com" }])

    expect(message).toBe(
      [
        "Here are my currently open browser tabs:",
        "1. example.com — https://example.com",
        "",
        "Please use these as context for my next questions.",
      ].join("\n")
    )
  })

  it("skips non-contextable tabs but keeps numbering contiguous for the rest", () => {
    const message = formatOpenTabsMessage([
      { title: "Extensions", url: "chrome://extensions" },
      { title: "Example Site", url: "https://example.com" },
    ])

    expect(message).toBe(
      [
        "Here are my currently open browser tabs:",
        "1. Example Site — https://example.com",
        "",
        "Please use these as context for my next questions.",
      ].join("\n")
    )
  })
})
