#!/usr/bin/env bun
/**
 * @fileoverview `paper-to-web` — the command-line front end.
 *
 * ```
 * paper-to-web <url | doi | file | -> [options]   convert one input
 * paper-to-web serve [--port 8787]                 run the widget web app
 *
 *   --outline          write an outline in the paper format instead
 *   --ai               use Claude for summaries, underlining and outlines
 *                      (ANTHROPIC_API_KEY or an `ant auth login` profile)
 *   --model <id>       model for --ai (default claude-opus-5-5)
 *   --focus <text>     steer an outline (an angle, resolution or side)
 *   --out <dir>        where to write (default ./<title-slug>)
 *   --format <list>    mdx, single, html, json or all (default mdx,html)
 * ```
 *
 * `mdx` writes the docs folder (index.mdx, 01-….mdx, references.mdx,
 * meta.json), ready to drop into a Fumadocs content directory; `single` one
 * combined page; `html` a self-contained reader page.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { parseArgs } from "node:util"
import { createAnthropicGenerator } from "../src/ai"
import { paperToHtml } from "../src/html"
import { paperToMdxFiles, paperToSingleMdx, slugify } from "../src/mdx"
import { convertToPaper } from "../src/pipeline"
import { createPaperToWebHandler } from "../src/server"

const HELP = `paper-to-web <url | doi | file | -> [--outline] [--ai] [--model id] [--focus text] [--out dir] [--format mdx,single,html,json|all]
paper-to-web serve [--port 8787] [--ai]`

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = []
  for await (const chunk of process.stdin) chunks.push(chunk as Buffer)
  return Buffer.concat(chunks).toString("utf8")
}

async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      outline: { type: "boolean", default: false },
      ai: { type: "boolean", default: false },
      model: { type: "string" },
      focus: { type: "string" },
      out: { type: "string" },
      format: { type: "string", default: "mdx,html" },
      port: { type: "string", default: "8787" },
      help: { type: "boolean", short: "h", default: false },
    },
  })
  if (values.help || positionals.length === 0) {
    console.log(HELP)
    return
  }
  const generate = values.ai ? createAnthropicGenerator({ model: values.model }) : undefined

  if (positionals[0] === "serve") {
    const Bun = (globalThis as { Bun?: { serve(options: { port: number; fetch(request: Request): Promise<Response> }): { url: URL } } }).Bun
    if (!Bun) throw new Error("`paper-to-web serve` runs under Bun: bunx paper-to-web serve")
    const server = Bun.serve({ port: Number(values.port), fetch: createPaperToWebHandler({ generate: generate ?? (process.env.ANTHROPIC_API_KEY ? createAnthropicGenerator({ model: values.model }) : undefined) }) })
    console.log(`Paper to Web AI on ${server.url}`)
    return
  }

  const target = positionals.join(" ")
  let input: string | Uint8Array
  let fileName: string | undefined
  if (target === "-") {
    input = await readStdin()
  } else if (!/^https?:\/\//i.test(target)) {
    const bytes = await readFile(target).catch(() => null)
    if (bytes) {
      fileName = path.basename(target)
      input = /\.(pdf|docx)$/i.test(target) ? new Uint8Array(bytes) : bytes.toString("utf8")
    } else {
      input = target
    }
  } else {
    input = target
  }

  const paper = await convertToPaper(input, {
    mode: values.outline ? "outline" : "paper",
    generate,
    fileName,
    focus: values.focus,
    onProgress: (message) => console.error(message),
  })

  const outDir = path.resolve(values.out ?? slugify(paper.title))
  await mkdir(outDir, { recursive: true })
  const formats = new Set((values.format === "all" ? "mdx,single,html,json" : values.format!).split(",").map((f) => f.trim()))
  const written: string[] = []
  const put = async (name: string, text: string) => {
    await writeFile(path.join(outDir, name), text)
    written.push(name)
  }
  if (formats.has("mdx")) for (const [name, text] of Object.entries(paperToMdxFiles(paper))) await put(name, text)
  if (formats.has("single")) await put(`${slugify(paper.title)}.mdx`, paperToSingleMdx(paper))
  if (formats.has("html")) await put("paper.html", paperToHtml(paper))
  if (formats.has("json")) await put("paper.json", `${JSON.stringify(paper, null, 2)}\n`)
  console.error(`${paper.title}: ${paper.sections.length} sections → ${outDir}`)
  for (const name of written) console.log(path.join(outDir, name))
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
