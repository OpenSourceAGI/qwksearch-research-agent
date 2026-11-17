#!/usr/bin/env node
/**
 * Copy every docs page from site/content/docs into the investing agent skill
 * as plain Markdown, so the skill carries the full docs offline.
 *
 *   node scripts/build-skill-docs.mjs        (or: bun run skill:docs)
 *
 * Output: skills/investing/references/<same path>.md and the page index
 * between the DOCS-INDEX markers in skills/investing/SKILL.md.
 *
 * Fumadocs JSX is flattened to Markdown: <TypeTable> becomes a table,
 * <Callout> a blockquote, <Tabs>/<Accordion>/<Step> headings, <Card> a link,
 * <StackBlitzButton> a link, and the interactive playgrounds a pointer to the
 * live site. Fenced code is left untouched.
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync, rmSync, existsSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const here = dirname(fileURLToPath(import.meta.url));
const pkg = resolve(here, "..");
const docsDir = join(pkg, "site/content/docs");
const skillDir = resolve(pkg, "../../skills/investing");
const outDir = join(skillDir, "references");
const SITE = "https://investing-lib.vercel.app";
const STACKBLITZ =
  "https://stackblitz.com/github/OpenSourceAGI/qwksearch-research-agent/tree/master/packages/investing/examples";

/** Page order from the meta.json files, depth first, same as the site sidebar. */
function orderedPages(dir, prefix = "") {
  const meta = JSON.parse(readFileSync(join(dir, "meta.json"), "utf8"));
  const out = [];
  for (const entry of meta.pages ?? []) {
    if (entry.startsWith("---")) {
      out.push({ section: entry.replace(/^-+|-+$/g, "") });
      continue;
    }
    const sub = join(dir, entry);
    if (existsSync(join(sub, "meta.json"))) {
      out.push({ file: join(sub, "index.mdx"), slug: `${prefix}${entry}` });
      for (const p of orderedPages(sub, `${prefix}${entry}/`)) {
        if (p.file !== join(sub, "index.mdx")) out.push(p);
      }
    } else if (existsSync(`${sub}.mdx`)) {
      out.push({ file: `${sub}.mdx`, slug: `${prefix}${entry}` });
    }
  }
  // Pages that exist on disk but are not listed in meta.json.
  for (const f of readdirSync(dir)) {
    if (!f.endsWith(".mdx") || (f === "index.mdx" && prefix)) continue;
    const file = join(dir, f);
    if (!out.some((p) => p.file === file)) out.push({ file, slug: `${prefix}${f.replace(/\.mdx$/, "")}` });
  }
  return out;
}

function parseFrontmatter(src) {
  const m = src.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!m) return { data: {}, body: src };
  const data = {};
  for (const line of m[1].split("\n")) {
    const kv = line.match(/^(\w+):\s*(.*)$/);
    if (kv) data[kv[1]] = kv[2].replace(/^["']|["']$/g, "");
  }
  return { data, body: src.slice(m[0].length) };
}

const cell = (s) => String(s ?? "").replace(/\|/g, "\\|").replace(/\n/g, " ");

function typeTable(objSrc) {
  let obj;
  try {
    obj = vm.runInNewContext(`(${objSrc})`, {});
  } catch {
    return "```\n" + objSrc.trim() + "\n```";
  }
  const rows = Object.entries(obj).map(
    ([name, v]) =>
      `| \`${cell(name)}\` | ${v.type ? "`" + cell(v.type) + "`" : ""} | ${v.default ? "`" + cell(v.default) + "`" : ""} | ${cell(v.description)} |`,
  );
  return ["| Name | Type | Default | Description |", "| --- | --- | --- | --- |", ...rows].join("\n");
}

function attr(tag, name) {
  const m = tag.match(new RegExp(`${name}=(?:"([^"]*)"|'([^']*)'|\\{['"]([^'"]*)['"]\\})`));
  return m ? (m[1] ?? m[2] ?? m[3]) : undefined;
}

/** Convert the non-code parts of an MDX body. */
function convertProse(text) {
  return (
    text
      // <TypeTable type={{ ... }} />
      .replace(/<TypeTable\s+type=\{\{([\s\S]*?)\}\}\s*\/>/g, (_, o) => typeTable(`{${o}}`))
      // Playgrounds
      .replace(/<(\w+Playground)\s*\/>/g, (_, n) => `> Interactive ${n.replace(/Playground$/, "")} playground: see the live docs at ${SITE}/docs/playground.`)
      // StackBlitz buttons
      .replace(/<StackBlitzButton([^>]*)\/>/g, (_, a) => {
        const ex = attr(a, "example");
        const file = attr(a, "file") ?? "src/index.ts";
        return `[Open \`${ex}\` in StackBlitz](${STACKBLITZ}/${ex}?file=${encodeURIComponent(file)}) · source: \`packages/investing/examples/${ex}\``;
      })
      // Callouts
      .replace(/<Callout([^>]*)>([\s\S]*?)<\/Callout>/g, (_, a, inner) => {
        const title = attr(a, "title");
        const type = (attr(a, "type") ?? "note").toUpperCase();
        const lines = inner.trim().split("\n").map((l) => l.replace(/^\s{2}/, ""));
        return [`> **${type}${title ? `: ${title}` : ""}**`, ">", ...lines.map((l) => `> ${l}`.trimEnd())].join("\n");
      })
      // Cards
      .replace(/<Cards>\s*/g, "")
      .replace(/\s*<\/Cards>/g, "")
      .replace(/<Card([^>]*?)\/>/g, (_, a) => `- [${attr(a, "title")}](${attr(a, "href")})${attr(a, "description") ? ` — ${attr(a, "description")}` : ""}`)
      .replace(/<Card([^>]*?)>([\s\S]*?)<\/Card>/g, (_, a, inner) => `- [${attr(a, "title")}](${attr(a, "href")}) — ${inner.trim()}`)
      // Tabs / Accordions / Steps become bold labels or plain blocks
      .replace(/<Tabs[^>]*>/g, "")
      .replace(/<\/Tabs>/g, "")
      .replace(/<Tab\s+value=["']([^"']*)["'][^>]*>/g, (_, v) => `**${v}**\n`)
      .replace(/<\/Tab>/g, "")
      .replace(/<Accordions[^>]*>/g, "")
      .replace(/<\/Accordions>/g, "")
      .replace(/<Accordion\s+title=["']([^"']*)["'][^>]*>/g, (_, t) => `**${t}**\n`)
      .replace(/<\/Accordion>/g, "")
      .replace(/<\/?Steps>/g, "")
      .replace(/<\/?Step>/g, "")
      // Site-relative links -> absolute
      .replace(/\]\(\/docs\//g, `](${SITE}/docs/`)
      .replace(/\n{3,}/g, "\n\n")
  );
}

function convert(body) {
  // Split on fenced code blocks; only convert the prose between them.
  const parts = body.split(/(^```[\s\S]*?^```)/m);
  return parts.map((p, i) => (i % 2 === 1 ? p : convertProse(p))).join("").trim();
}

const pages = orderedPages(docsDir);
rmSync(outDir, { recursive: true, force: true });
const index = [];
let section = "";
for (const p of pages) {
  if (p.section) {
    section = p.section;
    continue;
  }
  const { data, body } = parseFrontmatter(readFileSync(p.file, "utf8"));
  const out = join(outDir, `${p.slug}.md`);
  mkdirSync(dirname(out), { recursive: true });
  const url = `${SITE}/docs/${p.slug === "index" ? "" : p.slug}`;
  writeFileSync(
    out,
    `# ${data.title ?? p.slug}\n\n> ${data.description ?? ""}\n>\n> Source: ${url}\n\n${convert(body)}\n`,
  );
  index.push({ section, slug: p.slug, title: data.title ?? p.slug, description: data.description ?? "", rel: relative(skillDir, out) });
}

// Write the index into SKILL.md between markers.
const skillPath = join(skillDir, "SKILL.md");
const skill = readFileSync(skillPath, "utf8");
const lines = [];
let last = null;
for (const e of index) {
  if (e.section !== last) {
    lines.push(`\n**${e.section || "Guide"}**\n`);
    last = e.section;
  }
  lines.push(`- [${e.title}](${e.rel}) — ${e.description}`);
}
const block = `<!-- DOCS-INDEX:START (generated by packages/investing/scripts/build-skill-docs.mjs) -->\n${lines.join("\n").trim()}\n<!-- DOCS-INDEX:END -->`;
const next = skill.replace(/<!-- DOCS-INDEX:START[\s\S]*?<!-- DOCS-INDEX:END -->/, block);
if (next === skill && !skill.includes("DOCS-INDEX:START")) {
  console.warn("SKILL.md has no DOCS-INDEX markers; index not written");
} else {
  writeFileSync(skillPath, next);
}
console.log(`wrote ${index.length} pages to ${relative(process.cwd(), outDir)}`);
