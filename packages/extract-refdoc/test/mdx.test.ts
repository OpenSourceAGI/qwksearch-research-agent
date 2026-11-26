import { compile } from "@mdx-js/mdx"
import remarkGfm from "remark-gfm"
import { describe, expect, it } from "vitest"
import { finishPaper } from "../src/finish"
import { textToPaper } from "../src/html-to-paper"
import { paperMeta, paperToMdxFiles, paperToSingleMdx, slugify } from "../src/mdx"
import type { Paper } from "../src/types"

const paper: Paper = {
  title: "The Synergy Test",
  description: "Theory and action proceed together.",
  author: "Debate AI Institute",
  sourceUrl: "https://example.org/paper.pdf",
  abstract: "==Critiques are lenses==, not gateways.",
  keywords: ["critique", "fiat"],
  figure: { src: "https://i.imgur.com/a.png", caption: "The emblem" },
  sections: [
    {
      title: "Original Sin",
      part: "Part I. The Standard",
      description: "Prior questions are a false obstacle.",
      figure: { src: "https://i.imgur.com/b.png", caption: "Prior questions" },
      summary: [{ label: "Case comparison tests assumptions", text: "Every quote comparison already does." }],
      paragraphs: ["==The assumption was always wrong==, as \\{this\\} shows.", "### A subheading", "Second ==point== here."],
    },
    { title: "Theory Into Action", summary: [], paragraphs: ["Act and reflect together."] },
  ],
  references: ["Shanahan, William. 1993. *Kritik of Thinking*."],
}

describe("paperToMdxFiles", () => {
  const files = paperToMdxFiles(paper)

  it("writes the Synergy Slayer folder layout", () => {
    expect(Object.keys(files)).toEqual(["index.mdx", "01-original-sin.mdx", "02-theory-into-action.mdx", "references.mdx", "meta.json"])
    expect(JSON.parse(files["meta.json"])).toEqual(paperMeta(paper))
    expect(paperMeta(paper).pages).toEqual(["index", "---Part I. The Standard---", "01-original-sin", "02-theory-into-action", "references"])
  })

  it("writes section pages like the critiques paper: numbered title, figure, accordion summary, numbered paragraphs", () => {
    expect(files["01-original-sin.mdx"]).toBe(`---
title: "1. Original Sin"
description: "Prior questions are a false obstacle."
---

![Prior questions](https://i.imgur.com/b.png)

*Figure 2: Prior questions*

import { Accordion, Accordions } from 'fumadocs-ui/components/accordion';

<Accordions type="single" defaultValue="Section Summary">
<Accordion title="Section Summary">

1. **Case comparison tests assumptions:** Every quote comparison already does.

</Accordion>
</Accordions>

1. ==The assumption was always wrong==, as \\{this\\} shows.

### A subheading

2. Second ==point== here.
`)
  })

  it("writes the index with the abstract and keywords", () => {
    expect(files["index.mdx"]).toContain("**Abstract.** ==Critiques are lenses==, not gateways.")
    expect(files["index.mdx"]).toContain("***Keywords**: critique, fiat*")
    expect(files["index.mdx"]).toContain("*Figure 1: The emblem*")
  })

  it("produces MDX that compiles, in both accordion styles and as one page", async () => {
    const all = [...Object.entries(files), ...Object.entries(paperToMdxFiles(paper, { accordion: "details" })), ["single.mdx", paperToSingleMdx(paper)]]
    for (const [name, text] of all) {
      if (!name.endsWith(".mdx")) continue
      await expect(compile(text.replace(/^---[\s\S]*?---\n/, ""), { remarkPlugins: [remarkGfm] }), name).resolves.toBeTruthy()
    }
  })

  it("compiles MDX built from text full of characters MDX treats as code", async () => {
    const tricky = finishPaper(textToPaper("# Odd {Title} <x>\n\n## 1. Braces\n\nA function f(x) = {a: 1} <= b and c >= d is used in a == comparison here, which is common in technical papers about code."))
    for (const text of Object.values(paperToMdxFiles(tricky))) {
      if (text.startsWith("{")) continue
      await expect(compile(text.replace(/^---[\s\S]*?---\n/, ""), { remarkPlugins: [remarkGfm] })).resolves.toBeTruthy()
    }
  })
})

describe("slugify", () => {
  it("makes short ASCII slugs", () => {
    expect(slugify("Heidegger’s Calculative Thinking: A Response to the Critics of Policy")).toBe("heideggers-calculative-thinking-a-response-to")
    expect(slugify("Café ✨")).toBe("cafe")
    expect(slugify("!!!")).toBe("section")
  })
})
