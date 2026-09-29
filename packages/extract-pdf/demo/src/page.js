/**
 * @file page.js
 * @description The single-page demo UI served at `/`. Posts to /api/convert
 * and shows the result both rendered (in a sandboxed iframe) and as source.
 */
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
  <p class="lead">PDF to structured HTML (headings, lists, footnotes, code blocks) running on Cloudflare Workers. No OCR and no model, just the PDF text layer.</p>

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
const $ = (id) => document.getElementById(id);
const form = $("form"), fileInput = $("file"), drop = $("drop");
let lastHtml = "", lastName = "document";

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

  $("go").disabled = true;
  setStatus("Converting…");
  try {
    const res = await fetch("/api/convert", { method: "POST", body: data });
    const out = await res.json().catch(() => ({ error: "HTTP " + res.status }));
    if (!res.ok || out.error) throw new Error(out.error || "HTTP " + res.status);
    show(out);
    setStatus("");
  } catch (err) {
    setStatus(err.message, true);
  } finally {
    $("go").disabled = false;
  }
});

function show(out) {
  lastHtml = out.html || "";
  lastName = (out.title || out.source || "document").replace(/[^\\w.-]+/g, "_").slice(0, 60);
  const meta = [];
  if (out.title) meta.push("<strong>" + esc(out.title) + "</strong>");
  if (out.author) meta.push(esc(out.author));
  meta.push((out.bytes / 1048576).toFixed(2) + " MB in " + out.ms + " ms");
  $("meta").innerHTML = meta.join(" · ");
  $("preview").srcdoc = "<!doctype html><meta charset=utf-8><style>body{font:16px/1.6 Georgia,serif;max-width:720px;margin:24px auto;padding:0 16px;color:#1d1d1b}pre{background:#f3f3f0;padding:12px;overflow:auto}</style>" + lastHtml;
  $("source").firstChild.textContent = lastHtml;
  $("result").style.display = "block";
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
