import { describe, expect, it } from "vitest"
import { basenameFromPath, formatDownloadStatus } from "../lib/downloads"

describe("basenameFromPath", () => {
  it("returns the filename from a unix-style path", () => {
    expect(basenameFromPath("/home/user/Downloads/report.pdf")).toBe("report.pdf")
  })

  it("returns the filename from a windows-style path", () => {
    expect(basenameFromPath("C:\\Users\\me\\Downloads\\report.pdf")).toBe("report.pdf")
  })

  it("returns the input unchanged when there are no path separators", () => {
    expect(basenameFromPath("report.pdf")).toBe("report.pdf")
  })

  it("returns an empty string for an empty path", () => {
    expect(basenameFromPath("")).toBe("")
  })

  it("returns the path when it ends in a separator", () => {
    expect(basenameFromPath("/home/user/Downloads/")).toBe("/home/user/Downloads/")
  })
})

describe("formatDownloadStatus", () => {
  it("reports Complete for a finished download", () => {
    expect(formatDownloadStatus({ filename: "a", state: "complete" })).toBe("Complete")
  })

  it("reports Failed with the error reason for an interrupted download", () => {
    expect(
      formatDownloadStatus({ filename: "a", state: "interrupted", error: "NETWORK_FAILED" })
    ).toBe("Failed: NETWORK_FAILED")
  })

  it("reports plain Failed when an interrupted download has no error reason", () => {
    expect(formatDownloadStatus({ filename: "a", state: "interrupted" })).toBe("Failed")
  })

  it("reports Paused for a paused in-progress download", () => {
    expect(
      formatDownloadStatus({ filename: "a", state: "in_progress", paused: true, bytesReceived: 10, totalBytes: 100 })
    ).toBe("Paused")
  })

  it("reports a percentage for an in-progress download with a known size", () => {
    expect(
      formatDownloadStatus({ filename: "a", state: "in_progress", bytesReceived: 25, totalBytes: 100 })
    ).toBe("Downloading 25%")
  })

  it("caps the percentage at 100 even if bytesReceived exceeds totalBytes", () => {
    expect(
      formatDownloadStatus({ filename: "a", state: "in_progress", bytesReceived: 150, totalBytes: 100 })
    ).toBe("Downloading 100%")
  })

  it("reports plain Downloading when the total size is unknown (-1)", () => {
    expect(
      formatDownloadStatus({ filename: "a", state: "in_progress", bytesReceived: 10, totalBytes: -1 })
    ).toBe("Downloading")
  })

  it("reports plain Downloading when totalBytes is missing", () => {
    expect(formatDownloadStatus({ filename: "a", state: "in_progress" })).toBe("Downloading")
  })
})
