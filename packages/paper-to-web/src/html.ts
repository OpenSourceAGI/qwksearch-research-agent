/**
 * @fileoverview `Paper` → HTML, for the reader widget and the standalone
 * export.
 *
 * - `renderPaperBody` is the paper itself: title block, abstract, then each
 *   section with its figure, a Section Summary `<details>` and its numbered
 *   paragraphs, `==text==` rendered as `<mark class="debate-hl">`.
 * - `renderReaderToolbar` is the Reader mode / Underlining / Voice bar the
 *   runtime (`reader-runtime.ts`) wires up.
 * - `paperToHtml` wraps both, the stylesheet and the inlined runtime into one
 *   self-contained page that works offline from a file.
 *
 * @module html
 */
import { escapeHtml, isSubheading, markdownInlineToHtml, markdownToPlainText } from "./markdown"
import { sectionSlug } from "./mdx"
import { READER_RUNTIME_SOURCE } from "./reader-runtime"
import type { Paper, PaperFigure } from "./types"

function figureHtml(figure: PaperFigure, number: number): string {
  const caption = escapeHtml(figure.caption)
  const img = `<img src="${escapeHtml(figure.src)}" alt="${caption || `Figure ${number}`}" loading="lazy" />`
  return `<figure>${img}${caption ? `<figcaption>Figure ${number}: ${caption}</figcaption>` : ""}</figure>`
}

/** Numbered paragraphs, split into lists around `### ` subheadings; numbering continues across them. */
function paragraphsHtml(paragraphs: string[]): string {
  const out: string[] = []
  let items: string[] = []
  let n = 0
  const flush = () => {
    if (items.length > 0) out.push(`<ol class="ptw-paragraphs" start="${n - items.length + 1}">${items.join("")}</ol>`)
    items = []
  }
  for (const p of paragraphs) {
    if (isSubheading(p)) {
      flush()
      out.push(`<h3>${markdownInlineToHtml(p.slice(4))}</h3>`)
    } else {
      n += 1
      items.push(`<li><p>${markdownInlineToHtml(p)}</p></li>`)
    }
  }
  flush()
  return out.join("")
}

/** The Reader mode / Underlining / Voice toolbar. */
export function renderReaderToolbar(): string {
  return `<div class="ptw-toolbar" role="toolbar" aria-label="Reading options">
  <button type="button" data-ptw="reader" aria-pressed="false"><span aria-hidden="true">📖</span> <span data-ptw-label>Reader mode off</span></button>
  <button type="button" data-ptw="underline" aria-pressed="true"><span aria-hidden="true" class="ptw-u">U</span> <span data-ptw-label>Underlining on</span></button>
  <button type="button" data-ptw="voice" aria-pressed="false"><span aria-hidden="true">🔊</span> <span data-ptw-label>Voice</span></button>
  <label class="ptw-rate">Speed <select data-ptw="rate"><option value="1">1×</option><option value="1.2" selected>1.2×</option><option value="1.5">1.5×</option><option value="2">2×</option></select></label>
</div>`
}

/** The paper's content (see the module doc). */
export function renderPaperBody(paper: Paper): string {
  const out: string[] = []
  out.push(`<header class="ptw-header"><h1>${escapeHtml(paper.title)}</h1>`)
  if (paper.description) out.push(`<p class="ptw-description">${markdownInlineToHtml(paper.description)}</p>`)
  const byline = [paper.author, paper.date].filter(Boolean).map((part) => escapeHtml(part!))
  if (paper.sourceUrl) {
    byline.push(`<a href="${escapeHtml(paper.sourceUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(paper.sourceUrl.replace(/^https?:\/\//, ""))}</a>`)
  }
  if (byline.length > 0) out.push(`<p class="ptw-byline">${byline.join(" · ")}</p>`)
  out.push("</header>")
  if (paper.figure) out.push(figureHtml(paper.figure, 1))
  if (paper.abstract) out.push(`<p class="ptw-abstract"><strong>Abstract.</strong> ${markdownInlineToHtml(paper.abstract)}</p>`)
  if (paper.keywords?.length) out.push(`<p class="ptw-keywords"><em><strong>Keywords</strong>: ${escapeHtml(paper.keywords.join(", "))}</em></p>`)

  let figureNumber = paper.figure ? 1 : 0
  paper.sections.forEach((section, i) => {
    if (section.part) out.push(`<h2 class="ptw-part">${escapeHtml(section.part)}</h2>`)
    out.push(`<section class="ptw-section" id="${sectionSlug(section, i)}">`)
    out.push(`<h2>${i + 1}. ${escapeHtml(section.title)}</h2>`)
    if (section.description) out.push(`<p class="ptw-description">${markdownInlineToHtml(section.description)}</p>`)
    if (section.figure) {
      figureNumber += 1
      out.push(figureHtml(section.figure, figureNumber))
    }
    if (section.summary.length > 0) {
      out.push(
        `<details class="ptw-summary" open><summary>Section Summary</summary><ol>${section.summary
          .map((point) => `<li><strong>${markdownInlineToHtml(point.label)}:</strong> ${markdownInlineToHtml(point.text)}</li>`)
          .join("")}</ol></details>`,
      )
    }
    if (section.paragraphs.length > 0) out.push(paragraphsHtml(section.paragraphs))
    out.push("</section>")
  })
  if (paper.references.length > 0) {
    out.push(`<section class="ptw-section ptw-references" id="references"><h2>References</h2><ol>${paper.references.map((ref) => `<li>${markdownInlineToHtml(ref)}</li>`).join("")}</ol></section>`)
  }
  return out.join("\n")
}

/** The contents list (hidden in Reader mode). */
export function renderToc(paper: Paper): string {
  const items = paper.sections.map((section, i) => `<li><a href="#${sectionSlug(section, i)}">${i + 1}. ${escapeHtml(section.title)}</a></li>`)
  if (paper.references.length > 0) items.push('<li><a href="#references">References</a></li>')
  return `<nav class="ptw-toc" aria-label="Contents"><strong>Contents</strong><ol>${items.join("")}</ol></nav>`
}

/** Styles for the reader; scoped to `.ptw-paper`, light and dark. */
export const PAPER_READER_CSS = `
.ptw-paper{--ptw-bg:#fff;--ptw-fg:#1c1917;--ptw-muted:#78716c;--ptw-border:#e7e5e4;--ptw-accent:#2563eb;--ptw-mark:#fef08a;--ptw-reader-bg:#fbf7ef;
  color:var(--ptw-fg);background:var(--ptw-bg);font:16px/1.65 system-ui,-apple-system,"Segoe UI",sans-serif;display:grid;grid-template-columns:minmax(0,14rem) minmax(0,1fr);gap:2rem;padding:1rem;}
@media (prefers-color-scheme:dark){.ptw-paper{--ptw-bg:#0c0a09;--ptw-fg:#e7e5e4;--ptw-muted:#a8a29e;--ptw-border:#292524;--ptw-accent:#60a5fa;--ptw-mark:#854d0e;--ptw-reader-bg:#1c1917;}}
.ptw-paper *{box-sizing:border-box}
.ptw-toolbar{grid-column:1/-1;display:flex;flex-wrap:wrap;gap:.5rem;align-items:center;position:sticky;top:0;z-index:2;padding:.5rem 0;background:var(--ptw-bg);border-bottom:1px solid var(--ptw-border)}
.ptw-toolbar button,.ptw-toolbar select{font:inherit;font-size:.875rem;color:inherit;background:transparent;border:1px solid var(--ptw-border);border-radius:.5rem;padding:.3rem .7rem;cursor:pointer}
.ptw-toolbar button[aria-pressed="true"]{background:color-mix(in srgb,var(--ptw-accent) 15%,transparent);border-color:var(--ptw-accent)}
.ptw-u{text-decoration:underline;font-weight:700}
.ptw-rate{font-size:.875rem;color:var(--ptw-muted)}
.ptw-toc{position:sticky;top:3.5rem;align-self:start;font-size:.875rem;max-height:calc(100vh - 5rem);overflow:auto}
.ptw-toc ol{padding-left:0;list-style:none}.ptw-toc li{margin:.2rem 0}.ptw-toc a{color:inherit;text-decoration:none}.ptw-toc a:hover{color:var(--ptw-accent)}
.ptw-content{min-width:0;max-width:52rem}
.ptw-content h1{font-size:2rem;line-height:1.2;margin:.5rem 0}
.ptw-content h2{font-size:1.4rem;margin:2.5rem 0 .5rem}
.ptw-part{text-transform:uppercase;letter-spacing:.06em;font-size:1rem!important;color:var(--ptw-muted)}
.ptw-description,.ptw-byline{color:var(--ptw-muted)}
.ptw-content a{color:var(--ptw-accent)}
.ptw-content figure{margin:1.5rem 0}.ptw-content img{max-width:100%;height:auto;border-radius:.5rem}
.ptw-content figcaption{font-style:italic;color:var(--ptw-muted);font-size:.9rem;margin-top:.4rem}
.ptw-summary{border:1px solid var(--ptw-border);border-radius:.75rem;padding:.5rem 1rem;margin:1rem 0}
.ptw-summary summary{cursor:pointer;font-weight:600}
.ptw-paragraphs>li{margin:.9rem 0}.ptw-paragraphs p{margin:0}
.ptw-paper mark.debate-hl{background:transparent;color:inherit}
.ptw-paper[data-underline="on"] mark.debate-hl{background:var(--ptw-mark);text-decoration:underline;text-decoration-thickness:2px;text-underline-offset:2px;font-weight:600}
.ptw-paper [data-voice-reading]{outline:2px solid var(--ptw-accent);outline-offset:4px;border-radius:4px}
.ptw-paper[data-reader="on"]{grid-template-columns:minmax(0,1fr);background:var(--ptw-reader-bg)}
.ptw-paper[data-reader="on"] .ptw-toolbar{background:var(--ptw-reader-bg)}
.ptw-paper[data-reader="on"] .ptw-toc{display:none}
.ptw-paper[data-reader="on"] .ptw-content{margin:0 auto;max-width:40rem;font:1.15rem/1.8 Georgia,"Iowan Old Style","Times New Roman",serif}
@media (max-width:760px){.ptw-paper{grid-template-columns:minmax(0,1fr)}.ptw-toc{display:none}}
`

/** The reader markup: toolbar, contents and paper inside one `.ptw-paper` root. */
export function renderPaperReader(paper: Paper): string {
  return `<div class="ptw-paper" data-underline="on" data-reader="off">
${renderReaderToolbar()}
${renderToc(paper)}
<article class="ptw-content">
${renderPaperBody(paper)}
</article>
</div>`
}

/** One self-contained HTML page: reader, styles and runtime inlined. */
export function paperToHtml(paper: Paper): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(paper.title)}</title>
${paper.description ? `<meta name="description" content="${escapeHtml(markdownToPlainText(paper.description))}" />` : ""}
<style>body{margin:0;background:#fff}@media (prefers-color-scheme:dark){body{background:#0c0a09}}${PAPER_READER_CSS}</style>
</head>
<body>
${renderPaperReader(paper)}
<script>(${READER_RUNTIME_SOURCE})(document.querySelector(".ptw-paper"));</script>
</body>
</html>
`
}
