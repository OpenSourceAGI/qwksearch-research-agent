/**
 * @file page.js
 * @description The single-page demo UI served at `/`. Posts to /api/convert
 * and shows the result both rendered (in a sandboxed iframe) and as source.
 * When the response flags pages for OCR and the Worker has a Docling
 * processor, it renders those pages with PDF.js and swaps in the OCR'd HTML
 * one page at a time, after the fast result is already on screen.
 */

/** PDF.js for rendering flagged pages in the browser (the Worker has no canvas). */
const PDFJS_CDN = "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/";

export function renderPage({ maxMb }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>extract-pdf demo</title>
<style>
  :root { --bg:#f7f7f5; --panel:#fff; --text:#1d1d1b; --muted:#6b6b66; --line:#e2e2dc; --accent:#2f5bd3; --err:#b3261e; }
  @media (prefers-color-scheme: dark) {
    :root { --bg:#161615; --panel:#1f1f1d; --text:#ecece8; --muted:#a3a39c; --line:#33332f; --accent:#7b9cff; --err:#ff8a80; }
  }
  * { box-sizing: border-box; }
  body { margin:0; background:var(--bg); color:var(--text); font:15px/1.5 system-ui, -apple-system, Segoe UI, sans-serif; }
  main { max-width:960px; margin:0 auto; padding:32px 16px 64px; }
  h1 { font-size:24px; margin:0 0 4px; }
  p.lead { color:var(--muted); margin:0 0 24px; }
  form { background:var(--panel); border:1px solid var(--line); border-radius:10px; padding:20px; display:grid; gap:14px; }
  label.drop { border:2px dashed var(--line); border-radius:8px; padding:22px; text-align:center; cursor:pointer; color:var(--muted); }
  label.drop.over { border-color:var(--accent); color:var(--text); }
  input[type=url] { width:100%; padding:10px 12px; border:1px solid var(--line); border-radius:6px; background:transparent; color:inherit; font:inherit; }
  .row { display:flex; flex-wrap:wrap; gap:16px; align-items:center; }
  .or { color:var(--muted); text-align:center; font-size:13px; }
  button { background:var(--accent); color:#fff; border:0; border-radius:6px; padding:10px 18px; font:inherit; font-weight:600; cursor:pointer; }
  button:disabled { opacity:.6; cursor:progress; }
  button.ghost { background:transparent; color:var(--accent); border:1px solid var(--line); padding:6px 12px; font-weight:500; }
  #status { color:var(--muted); min-height:1.5em; margin:16px 0 8px; }
  #status.err { color:var(--err); }
  #result { display:none; background:var(--panel); border:1px solid var(--line); border-radius:10px; overflow:hidden; }
  .bar { display:flex; flex-wrap:wrap; gap:8px; align-items:center; padding:10px 12px; border-bottom:1px solid var(--line); }
  .bar .meta { flex:1; min-width:200px; font-size:13px; color:var(--muted); }
  .bar .meta strong { color:var(--text); }
  iframe { width:100%; height:70vh; border:0; background:#fff; display:block; }
  pre { margin:0; padding:16px; height:70vh; overflow:auto; font-size:12.5px; white-space:pre-wrap; word-break:break-word; }
  code { font-family:ui-monospace, SFMono-Regular, Menlo, monospace; }
  footer { margin-top:24px; font-size:13px; color:var(--muted); }
  footer code { background:var(--panel); border:1px solid var(--line); padding:1px 5px; border-radius:4px; }
</style>
</head>
<body>
<main>
  <h1>extract-pdf demo</h1>
  <p class="lead">PDF to structured HTML (headings, lists, footnotes, code blocks) running on Cloudflare Workers. The text layer comes back at once; pages that look scanned or hold tables and figures can then be enhanced with Granite Docling OCR.</p>

  <form id="form">
    <label class="drop" id="drop">
      <input type="file" name="file" id="file" accept="application/pdf,.pdf" hidden>
      <span id="dropText">Drop a PDF here or <u>choose a file</u> (max ${maxMb} MB)</span>
    </label>
    <div class="or">or</div>
    <input type="url" name="url" id="url" placeholder="https://arxiv.org/pdf/1706.03762">
    <div class="row">
      <label><input type="checkbox" name="addPageNumbers"> Page number markers</label>
      <label><input type="checkbox" name="addCitation" checked> Detect title and author</label>
      <span style="flex:1"></span>
      <button id="go" type="submit">Convert</button>
    </div>
  </form>

  <div id="status"></div>

  <section id="result">
    <div class="bar">
      <div class="meta" id="meta"></div>
      <button class="ghost" type="button" id="toggle">View HTML source</button>
      <button class="ghost" type="button" id="copy">Copy HTML</button>
      <button class="ghost" type="button" id="download">Download</button>
    </div>
    <iframe id="preview" sandbox="" title="Converted HTML preview"></iframe>
    <pre id="source" hidden><code></code></pre>
  </section>

  <footer>
    API: <code>POST /api/convert</code> with a <code>file</code> form field, JSON <code>{"url": "..."}</code>, or a raw PDF body.
    Or <code>GET /api/convert?url=...</code>.
  </footer>
</main>
<script>
const PDFJS_CDN = "${PDFJS_CDN}";
const $ = (id) => document.getElementById(id);
const form = $("form"), fileInput = $("file"), drop = $("drop");
let lastHtml = "", lastName = "document";
// Per-page HTML of the current result (null when it can't be split), the
// source the pages are rendered from for OCR, and a counter that stops an
// enhancement still running for an older result.
let pages = null, baseHtml = "", appended = [], source = null, numbered = false, run = 0;

fileInput.addEventListener("change", () => {
  const f = fileInput.files[0];
  $("dropText").textContent = f ? f.name + " (" + (f.size / 1048576).toFixed(1) + " MB)" : "Drop a PDF here or choose a file";
  if (f) $("url").value = "";
});
["dragenter", "dragover"].forEach((e) => drop.addEventListener(e, (ev) => { ev.preventDefault(); drop.classList.add("over"); }));
["dragleave", "drop"].forEach((e) => drop.addEventListener(e, (ev) => { ev.preventDefault(); drop.classList.remove("over"); }));
drop.addEventListener("drop", (ev) => {
  if (!ev.dataTransfer.files.length) return;
  fileInput.files = ev.dataTransfer.files;
  fileInput.dispatchEvent(new Event("change"));
});

form.addEventListener("submit", async (ev) => {
  ev.preventDefault();
  const data = new FormData(form);
  const hasFile = fileInput.files.length > 0;
  if (!hasFile && !data.get("url")) return setStatus("Choose a PDF or paste a URL.", true);
  if (!hasFile) data.delete("file");
  data.set("addPageNumbers", form.addPageNumbers.checked);
  data.set("addCitation", form.addCitation.checked);

  source = hasFile ? { file: fileInput.files[0] } : { url: data.get("url") };
  numbered = form.addPageNumbers.checked;
  $("go").disabled = true;
  setStatus("Converting…");
  try {
    const res = await fetch("/api/convert", { method: "POST", body: data });
    const out = await res.json().catch(() => ({ error: "HTTP " + res.status }));
    if (!res.ok || out.error) throw new Error(out.error || "HTTP " + res.status);
    show(out);
    setStatus("");
    offerOcr(out.ocr);
  } catch (err) {
    setStatus(err.message, true);
  } finally {
    $("go").disabled = false;
  }
});

function show(out) {
  run++;
  baseHtml = out.html || "";
  pages = splitPages(baseHtml, out.ocr && out.ocr.pageCount);
  appended = [];
  lastName = (out.title || out.source || "document").replace(/[^\\w.-]+/g, "_").slice(0, 60);
  const meta = [];
  if (out.title) meta.push("<strong>" + esc(out.title) + "</strong>");
  if (out.author) meta.push(esc(out.author));
  meta.push((out.bytes / 1048576).toFixed(2) + " MB in " + out.ms + " ms");
  $("meta").innerHTML = meta.join(" · ");
  render();
  $("result").style.display = "block";
}

function render() {
  lastHtml = (pages ? pages.join("") : baseHtml) + appended.join("");
  $("preview").srcdoc = "<!doctype html><meta charset=utf-8><style>body{font:16px/1.6 Georgia,serif;max-width:720px;margin:24px auto;padding:0 16px;color:#1d1d1b}pre{background:#f3f3f0;padding:12px;overflow:auto}.ocr-page{border-left:3px solid #2f5bd3;padding-left:12px}table{border-collapse:collapse}td,th{border:1px solid #ccc;padding:2px 6px}</style>" + lastHtml;
  $("source").firstChild.textContent = lastHtml;
}

// Each page opens with <p id="page-N">; later paragraphs of the page carry
// other ids, so a page starts where the next page number first appears.
function splitPages(html, count) {
  const starts = [];
  let next = 1;
  for (const m of html.matchAll(/<p id="page-(\\d+)">/g)) {
    if (Number(m[1]) === next) { starts.push(m.index); next++; }
  }
  if (!count || starts.length !== count || starts[0] !== 0) return null;
  return starts.map((start, i) => html.slice(start, i + 1 < starts.length ? starts[i + 1] : html.length));
}

function listPages(nums) {
  return nums.length === 1 ? "page " + nums[0] : "pages " + nums.slice(0, -1).join(", ") + " and " + nums[nums.length - 1];
}

function offerOcr(ocr) {
  if (!ocr || !ocr.needed) return;
  if (!ocr.enhance) {
    return setStatus(listPages(ocr.pagesNeedingOcr) + " may be scanned or hold tables or figures. OCR enhancement is not configured on this deployment.");
  }
  enhance(ocr.pagesNeedingOcr.slice(0, ocr.enhance.maxPages), ocr.enhance.endpoint).catch((err) => setStatus("OCR enhancement failed: " + err.message, true));
}

async function enhance(targets, endpoint) {
  const mine = run, done = [], failed = [];
  setStatus("Enhancing " + listPages(targets) + "…");
  const pdfjs = await import(PDFJS_CDN + "pdf.min.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = PDFJS_CDN + "pdf.worker.min.mjs";
  const bytes = source.file
    ? await source.file.arrayBuffer()
    : await fetch("/api/source?url=" + encodeURIComponent(source.url)).then((res) => {
        if (!res.ok) throw new Error("could not fetch the PDF again (HTTP " + res.status + ")");
        return res.arrayBuffer();
      });
  const doc = await pdfjs.getDocument({ data: bytes }).promise;
  for (const n of targets) {
    if (mine !== run) return;
    setStatus("Enhancing " + listPages([n]) + " (" + (done.length + failed.length + 1) + " of " + targets.length + ")…");
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ page: n, imageBase64: await renderPage(doc, n) }),
      });
      const out = await res.json().catch(() => ({ error: "HTTP " + res.status }));
      if (!res.ok || out.error) throw new Error(out.error || "HTTP " + res.status);
      if (mine !== run) return;
      const section = '<section class="ocr-page" id="page-' + n + '">' + (numbered ? " [" + n + "] " : "") + out.html + "</section>";
      if (pages && pages[n - 1] !== undefined) pages[n - 1] = section;
      else appended.push(section);
      render();
      done.push(n);
    } catch (err) {
      console.error("OCR of page " + n + " failed:", err);
      failed.push(n);
    }
  }
  if (mine !== run) return;
  const parts = [];
  if (done.length) parts.push("Enhanced " + listPages(done) + " with OCR.");
  if (failed.length) parts.push("OCR failed for " + listPages(failed) + "; the text-layer version is kept.");
  setStatus(parts.join(" "), failed.length > 0 && !done.length);
}

/** Renders one page to a PNG (longest side at most 2000px) as base64. */
async function renderPage(doc, n) {
  const page = await doc.getPage(n);
  const base = page.getViewport({ scale: 1 });
  const viewport = page.getViewport({ scale: Math.min(2, 2000 / Math.max(base.width, base.height)) });
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  await page.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
  return String(dataUrl).split(",")[1];
}

$("toggle").onclick = () => {
  const src = $("source").hidden;
  $("source").hidden = !src;
  $("preview").hidden = src;
  $("toggle").textContent = src ? "View rendered" : "View HTML source";
};
$("copy").onclick = async () => {
  await navigator.clipboard.writeText(lastHtml);
  $("copy").textContent = "Copied";
  setTimeout(() => ($("copy").textContent = "Copy HTML"), 1200);
};
$("download").onclick = () => {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([lastHtml], { type: "text/html" }));
  a.download = lastName + ".html";
  a.click();
  URL.revokeObjectURL(a.href);
};

function setStatus(msg, isErr) { $("status").textContent = msg; $("status").className = isErr ? "err" : ""; }
function esc(s) { return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]); }
</script>
</body>
</html>`;
}
