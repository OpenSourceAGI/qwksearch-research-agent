import { parseHTML } from "linkedom"
import { describe, expect, it } from "vitest"
import { cleanMathText, escapeMdxText, htmlInlineToMarkdown, markdownInlineToHtml, markdownToPlainText } from "../src/markdown"

const inline = (html: string) => {
  const { document } = parseHTML(`<html><body><p>${html}</p></body></html>`)
  return htmlInlineToMarkdown(document.querySelector("p") as never)
}

describe("escapeMdxText", () => {
  it("escapes characters MDX would read as JSX or highlight markers", () => {
    expect(escapeMdxText("a {b} <c> d==e")).toBe("a \\{b\\} &lt;c&gt; d=​=e")
  })
})

describe("htmlInlineToMarkdown", () => {
  it("keeps bold, italics, links and turns underlining into ==marks==", () => {
    expect(inline('A <strong>bold</strong> <em>claim</em> with <u>underlined <mark>words</mark></u> and <a href="https://x.org/a">a link</a>.')).toBe(
      "A **bold** *claim* with ==underlined words== and [a link](https://x.org/a).",
    )
  })

  it("drops in-page anchors such as citation jumps", () => {
    expect(inline('as shown [<a href="https://arxiv.org/html/1#bib.bib5">5</a>]')).toBe("as shown [5]")
  })

  it("keeps the rendered half of extracted math", () => {
    expect(inline('state <math>hth_{t}</math> and <math>N=6N=6</math>')).toBe("state ht and N=6")
  })
})

describe("cleanMathText", () => {
  it.each([
    ["hth_{t}", "ht"],
    ["QQ", "Q"],
    ["(x1,…,xn)(x_{1},...,x_{n})", "(x1,…,xn)"],
    ["𝐳=(z1,…,zn)\\mathbf{z}=(z_{1},...,z_{n})", "𝐳=(z1,…,zn)"],
    ["x2", "x2"],
  ])("%s → %s", (input, expected) => {
    expect(cleanMathText(input)).toBe(expected)
  })
})

describe("markdownInlineToHtml", () => {
  it("renders marks the way help-docs' remark plugin does", () => {
    expect(markdownInlineToHtml("==Read this== and **that** with *care*")).toBe(
      '<mark class="debate-hl">Read this</mark> and <strong>that</strong> with <em>care</em>',
    )
  })

  it("renders links and images without touching their URLs", () => {
    expect(markdownInlineToHtml("[a_b](https://x.org/a_b_c) ![fig](https://x.org/f.png)")).toBe(
      '<a href="https://x.org/a_b_c" target="_blank" rel="noopener noreferrer">a_b</a> <img src="https://x.org/f.png" alt="fig" loading="lazy" />',
    )
  })

  it("escapes HTML and undoes MDX escapes", () => {
    expect(markdownInlineToHtml(escapeMdxText("x < {y}"))).toBe("x &lt; {y}")
  })
})

describe("markdownToPlainText", () => {
  it("strips markers and link syntax", () => {
    expect(markdownToPlainText("==A== **b** [c](https://x.org) *d*")).toBe("A b c d")
  })
})
