/**
 * @fileoverview The standalone widget as a tiny web app: one Fetch-API
 * handler (`Request` → `Response`), so it runs under `Bun.serve`, a
 * Cloudflare Worker, Deno or any Node adapter, and stays out of the main
 * site.
 *
 * - `GET /` — the widget page: paste a link, DOI or text, or drop a PDF /
 *   `.docx`; pick "Paper" or "Outline"; read the result with Reader mode,
 *   Underlining and Voice; download the MDX folder files, one combined
 *   `.mdx`, a standalone `.html`, or the JSON.
 * - `POST /api/convert` — JSON `{ input, mode, ai }` or multipart with a
 *   `file` field. Replies `{ paper, reader, files, mdx, html }`.
 * - `GET /api/status` — `{ ai }`, whether a model is configured.
 *
 * Scraping runs server-side, so the page has no CORS limits on what it can
 * read.
 *
 * @module server
 */
import type { TextGenerator } from "./ai"
import { paperToHtml, PAPER_READER_CSS, renderPaperReader } from "./html"
import { paperToMdxFiles, paperToSingleMdx } from "./mdx"
import { convertToPaper, type ConvertMode } from "./pipeline"
import { READER_RUNTIME_SOURCE } from "./reader-runtime"
import type { Extractor } from "./source"
import type { Paper } from "./types"

export interface PaperToWebServerOptions {
  /** The model for AI mode. Without one, AI requests fall back to the offline pass. */
  generate?: TextGenerator
  /** Replace the extractor. */
  extract?: Extractor
  /** Largest upload, in bytes (default 40 MB). */
  maxUploadBytes?: number
}

/** Everything a client needs to show and download a converted paper. */
export interface ConvertResponse {
  paper: Paper
  /** Reader markup (toolbar + contents + paper) to drop into the page. */
  reader: string
  /** The MDX docs folder, by file name. */
  files: Record<string, string>
  /** The whole paper as one MDX page. */
  mdx: string
  /** A self-contained HTML page. */
  html: string
}

/** Build the response body for a converted paper. */
export function buildConvertResponse(paper: Paper): ConvertResponse {
  return {
    paper,
    reader: renderPaperReader(paper),
    files: paperToMdxFiles(paper),
    mdx: paperToSingleMdx(paper),
    html: paperToHtml(paper),
  }
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8" } })
}

/** The Fetch handler (see the module doc). */
export function createPaperToWebHandler(options: PaperToWebServerOptions = {}): (request: Request) => Promise<Response> {
  const maxUpload = options.maxUploadBytes ?? 40 * 1024 * 1024
  return async (request) => {
    const url = new URL(request.url)
    if (request.method === "GET" && (url.pathname === "/" || url.pathname === "/index.html")) {
      return new Response(widgetPageHtml(), { headers: { "content-type": "text/html; charset=utf-8" } })
    }
    if (request.method === "GET" && url.pathname === "/api/status") return json({ ai: Boolean(options.generate) })
    if (url.pathname !== "/api/convert") return json({ error: "Not found" }, 404)
    if (request.method !== "POST") return json({ error: "Use POST" }, 405)

    let input: string | Uint8Array = ""
    let mode: ConvertMode = "paper"
    let useAi = false
    let fileName: string | undefined
    let focus: string | undefined
    try {
      if ((request.headers.get("content-type") ?? "").includes("multipart/form-data")) {
        const form = await request.formData()
        const file = form.get("file")
        if (file && typeof file !== "string" && file.size > 0) {
          if (file.size > maxUpload) return json({ error: `File is over ${Math.round(maxUpload / 1048576)} MB` }, 413)
          input = new Uint8Array(await file.arrayBuffer())
          fileName = file.name
        } else {
          input = String(form.get("input") ?? "")
        }
        mode = form.get("mode") === "outline" ? "outline" : "paper"
        useAi = form.get("ai") === "on" || form.get("ai") === "true"
        focus = String(form.get("focus") ?? "") || undefined
      } else {
        const body = (await request.json()) as { input?: string; mode?: string; ai?: boolean; focus?: string }
        input = String(body.input ?? "")
        mode = body.mode === "outline" ? "outline" : "paper"
        useAi = Boolean(body.ai)
        focus = body.focus || undefined
      }
    } catch {
      return json({ error: "Could not read the request" }, 400)
    }
    if (typeof input === "string" && !input.trim()) return json({ error: "Give a link, a DOI, some text, or a file" }, 400)

    try {
      const paper = await convertToPaper(input, {
        mode,
        fileName,
        focus,
        extract: options.extract,
        generate: useAi ? options.generate : undefined,
      })
      return json(buildConvertResponse(paper))
    } catch (error) {
      return json({ error: error instanceof Error ? error.message : String(error) }, 422)
    }
  }
}

/** The widget page served at `/`. */
export function widgetPageHtml(): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Paper to Web AI</title>
<style>
:root{--bg:#fff;--fg:#1c1917;--muted:#78716c;--border:#e7e5e4;--accent:#2563eb}
@media (prefers-color-scheme:dark){:root{--bg:#0c0a09;--fg:#e7e5e4;--muted:#a8a29e;--border:#292524;--accent:#60a5fa}}
body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif}
.ptw-app{max-width:72rem;margin:0 auto;padding:1.5rem 16px}
.ptw-app h1{margin:0 0 .25rem;font-size:1.6rem}.ptw-app>p{margin:0 0 1rem;color:var(--muted)}
.ptw-form{display:grid;gap:.75rem;border:1px solid var(--border);border-radius:.75rem;padding:1rem}
.ptw-form textarea{width:100%;box-sizing:border-box;min-height:5rem;font:inherit;color:inherit;background:transparent;border:1px solid var(--border);border-radius:.5rem;padding:.6rem}
.ptw-row{display:flex;flex-wrap:wrap;gap:.75rem;align-items:center}
.ptw-row input[type=text]{flex:1;min-width:12rem;font:inherit;color:inherit;background:transparent;border:1px solid var(--border);border-radius:.5rem;padding:.4rem .6rem}
.ptw-form button,.ptw-downloads button{font:inherit;border-radius:.5rem;border:1px solid var(--accent);background:var(--accent);color:#fff;padding:.45rem 1rem;cursor:pointer}
.ptw-downloads button{background:transparent;color:inherit;border-color:var(--border);font-size:.875rem}
.ptw-status{color:var(--muted);min-height:1.5rem}.ptw-status.error{color:#dc2626}
.ptw-downloads{display:flex;flex-wrap:wrap;gap:.5rem;margin:1rem 0}
${PAPER_READER_CSS}
</style>
</head>
<body>
<main class="ptw-app">
<h1>Paper to Web AI</h1>
<p>Turn a PDF, research paper, archive link or any text into paper sections with summaries, card underlining, reader mode and voice, or write an outline in that format.</p>
<form class="ptw-form" id="ptw-form">
  <textarea name="input" placeholder="Paste a link (arXiv, DOI, archive.org, any article or PDF URL), a topic, or the text itself"></textarea>
  <div class="ptw-row">
    <label>or a file <input type="file" name="file" accept=".pdf,.docx,.md,.txt,.html" /></label>
  </div>
  <div class="ptw-row">
    <label><input type="radio" name="mode" value="paper" checked /> Paper sections</label>
    <label><input type="radio" name="mode" value="outline" /> Outline</label>
    <label id="ptw-ai-label"><input type="checkbox" name="ai" value="on" /> Use AI</label>
    <input type="text" name="focus" placeholder="Outline focus (optional): an angle, resolution or side" />
    <button type="submit">Convert</button>
  </div>
  <div class="ptw-status" id="ptw-status" role="status"></div>
</form>
<div class="ptw-downloads" id="ptw-downloads" hidden></div>
<div id="ptw-result"></div>
</main>
<script>
var mountPaperReader = ${READER_RUNTIME_SOURCE};
(function () {
  var form = document.getElementById("ptw-form");
  var status = document.getElementById("ptw-status");
  var result = document.getElementById("ptw-result");
  var downloads = document.getElementById("ptw-downloads");
  var handle = null;
  fetch("/api/status").then(function (r) { return r.json(); }).then(function (s) {
    if (!s.ai) { var label = document.getElementById("ptw-ai-label"); label.title = "Set ANTHROPIC_API_KEY on the server to enable AI"; label.querySelector("input").disabled = true; }
  }).catch(function () {});
  function save(name, text, type) {
    var url = URL.createObjectURL(new Blob([text], { type: type }));
    var a = document.createElement("a"); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }
  function slug(text) { return (text || "paper").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "paper"; }
  function button(label, fn) { var b = document.createElement("button"); b.type = "button"; b.textContent = label; b.addEventListener("click", fn); downloads.appendChild(b); }
  form.addEventListener("submit", function (event) {
    event.preventDefault();
    var data = new FormData(form);
    status.className = "ptw-status"; status.textContent = "Converting… scraping and extracting can take a minute.";
    form.querySelector("button[type=submit]").disabled = true;
    fetch("/api/convert", { method: "POST", body: data }).then(function (r) { return r.json(); }).then(function (body) {
      if (body.error) throw new Error(body.error);
      if (handle) handle.destroy();
      result.innerHTML = body.reader;
      handle = mountPaperReader(result.querySelector(".ptw-paper"));
      var base = slug(body.paper.title);
      downloads.innerHTML = ""; downloads.hidden = false;
      button("Download .mdx", function () { save(base + ".mdx", body.mdx, "text/markdown"); });
      button("Download .html", function () { save(base + ".html", body.html, "text/html"); });
      button("Download .json", function () { save(base + ".json", JSON.stringify(body.paper, null, 2), "application/json"); });
      Object.keys(body.files).forEach(function (name) { button(name, function () { save(name, body.files[name], "text/plain"); }); });
      status.textContent = body.paper.sections.length + " sections";
    }).catch(function (error) {
      status.className = "ptw-status error"; status.textContent = error.message;
    }).then(function () { form.querySelector("button[type=submit]").disabled = false; });
  });
})();
</script>
</body>
</html>
`
}
