import { describe, expect, it } from "vitest"
import { createPaperToWebHandler, type ConvertResponse } from "../src/server"
import type { TextGenerator } from "../src/ai"

const TEXT = "# Case\n\n## Harms\n\nThe status quo fails every student who wants to debate because coaches are scarce and travel costs are high."

describe("createPaperToWebHandler", () => {
  const handler = createPaperToWebHandler()

  it("serves the widget page", async () => {
    const response = await handler(new Request("http://localhost/"))
    expect(response.headers.get("content-type")).toContain("text/html")
    const html = await response.text()
    expect(html).toContain("Paper to Web AI")
    expect(html).toContain("var mountPaperReader = function mountPaperReader")
  })

  it("reports whether AI is configured", async () => {
    expect(await (await handler(new Request("http://localhost/api/status"))).json()).toEqual({ ai: false })
    const withAi = createPaperToWebHandler({ generate: async () => "" })
    expect(await (await withAi(new Request("http://localhost/api/status"))).json()).toEqual({ ai: true })
  })

  it("converts JSON input into the paper, reader, MDX files and HTML", async () => {
    const response = await handler(new Request("http://localhost/api/convert", { method: "POST", body: JSON.stringify({ input: TEXT }) }))
    const body = (await response.json()) as ConvertResponse
    expect(body.paper.title).toBe("Case")
    expect(Object.keys(body.files)).toEqual(["index.mdx", "01-harms.mdx", "meta.json"])
    expect(body.mdx).toContain("## 1. Harms")
    expect(body.reader).toContain('class="ptw-paper"')
    expect(body.html).toMatch(/^<!doctype html>/)
  })

  it("accepts multipart forms, including outline mode with AI", async () => {
    const generate: TextGenerator = async () => JSON.stringify({ title: "Outline", sections: [{ title: "S", summary: [{ label: "a", text: "b" }], paragraphs: ["p"] }] })
    const form = new FormData()
    form.set("input", "critiques in debate")
    form.set("mode", "outline")
    form.set("ai", "on")
    const response = await createPaperToWebHandler({ generate })(new Request("http://localhost/api/convert", { method: "POST", body: form }))
    expect(((await response.json()) as ConvertResponse).paper.title).toBe("Outline")
  })

  it("rejects empty input, wrong methods and unknown paths", async () => {
    expect((await handler(new Request("http://localhost/api/convert", { method: "POST", body: JSON.stringify({ input: " " }) }))).status).toBe(400)
    expect((await handler(new Request("http://localhost/api/convert"))).status).toBe(405)
    expect((await handler(new Request("http://localhost/nope"))).status).toBe(404)
  })

  it("returns extraction errors as 422", async () => {
    const failing = createPaperToWebHandler({ extract: async () => ({ error: "blocked" }) })
    const response = await failing(new Request("http://localhost/api/convert", { method: "POST", body: JSON.stringify({ input: "https://example.org/a" }) }))
    expect(response.status).toBe(422)
    expect(((await response.json()) as { error: string }).error).toMatch(/blocked/)
  })
})
