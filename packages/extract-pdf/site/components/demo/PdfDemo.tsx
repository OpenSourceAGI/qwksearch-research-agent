/**
 * The extract-pdf half of the demo: upload a PDF or paste a URL, get the
 * text-layer HTML back from `POST /api/convert` at once, then, when the
 * response flags pages and the Worker has a Docling processor, enhance those
 * pages with OCR one at a time.
 *
 * The Worker has no canvas, so the OCR follow-up runs here: PDF.js (from a
 * CDN, only when there is something to enhance) renders each flagged page to
 * a PNG, and `POST /api/enhance` forwards it with the Worker's secrets. Each
 * OCR'd page replaces its text-layer version as
 * `<section class="ocr-page" id="page-N">`; a page whose OCR fails keeps it.
 */
import { useRef, useState, type DragEvent, type FormEvent } from 'react';

import type { ConvertResponse, OcrSummary } from '../../worker/api';
import { ResultView, safeFileName } from './ResultView';

/** PDF.js for rendering flagged pages in the browser. */
const PDFJS_CDN = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/';

type Source = { file: File } | { url: string };

interface Result {
  out: ConvertResponse;
  /** Per-page HTML, or null when the HTML could not be split by page. */
  pages: string[] | null;
  /** OCR'd pages that could not be put back in place. */
  appended: string[];
}

interface PdfPage {
  getViewport(options: { scale: number }): { width: number; height: number };
  render(options: { canvasContext: CanvasRenderingContext2D; viewport: unknown }): { promise: Promise<void> };
}

interface PdfDocument {
  getPage(n: number): Promise<PdfPage>;
}

interface PdfJs {
  GlobalWorkerOptions: { workerSrc: string };
  getDocument(options: { data: ArrayBuffer }): { promise: Promise<PdfDocument> };
}

export function PdfDemo({ maxMb }: { maxMb: number | null }) {
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState('');
  const [addPageNumbers, setAddPageNumbers] = useState(false);
  const [addCitation, setAddCitation] = useState(true);
  const [busy, setBusy] = useState(false);
  const [over, setOver] = useState(false);
  const [status, setStatus] = useState<{ text: string; error?: boolean }>({ text: '' });
  const [result, setResult] = useState<Result | null>(null);
  // Bumped for every new conversion, so an enhancement still running for an
  // older result stops instead of writing into the new one.
  const run = useRef(0);
  const fileInput = useRef<HTMLInputElement>(null);

  const chooseFile = (next: File | null) => {
    setFile(next);
    if (next) setUrl('');
  };

  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    setOver(false);
    const dropped = event.dataTransfer.files[0];
    if (dropped) chooseFile(dropped);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!file && !url.trim()) return setStatus({ text: 'Choose a PDF or paste a URL.', error: true });

    const data = new FormData();
    if (file) data.set('file', file);
    else data.set('url', url.trim());
    data.set('addPageNumbers', String(addPageNumbers));
    data.set('addCitation', String(addCitation));
    const source: Source = file ? { file } : { url: url.trim() };

    setBusy(true);
    setStatus({ text: 'Converting…' });
    try {
      const res = await fetch('/api/convert', { method: 'POST', body: data });
      const out = (await res.json().catch(() => ({ error: `HTTP ${res.status}` }))) as ConvertResponse & { error?: string };
      if (!res.ok || out.error) throw new Error(out.error || `HTTP ${res.status}`);
      const mine = ++run.current;
      const next: Result = { out, pages: splitPages(out.html, out.ocr?.pageCount), appended: [] };
      setResult(next);
      setStatus({ text: '' });
      void offerOcr(out.ocr, source, addPageNumbers, mine, next);
    } catch (err) {
      setStatus({ text: (err as Error).message, error: true });
    } finally {
      setBusy(false);
    }
  };

  const offerOcr = async (ocr: OcrSummary, source: Source, numbered: boolean, mine: number, base: Result) => {
    if (!ocr?.needed) return;
    if (!ocr.enhance) {
      setStatus({
        text: `${capitalize(listPages(ocr.pagesNeedingOcr))} may be scanned or hold tables or figures. OCR enhancement is not configured on this deployment.`,
      });
      return;
    }
    const targets = ocr.pagesNeedingOcr.slice(0, ocr.enhance.maxPages);
    const done: number[] = [];
    const failed: number[] = [];
    let current = base;
    try {
      setStatus({ text: `Enhancing ${listPages(targets)}…` });
      const pdfjs = (await import(/* @vite-ignore */ `${PDFJS_CDN}pdf.min.mjs`)) as PdfJs;
      pdfjs.GlobalWorkerOptions.workerSrc = `${PDFJS_CDN}pdf.worker.min.mjs`;
      const bytes =
        'file' in source
          ? await source.file.arrayBuffer()
          : await fetch(`/api/source?url=${encodeURIComponent(source.url)}`).then((res) => {
              if (!res.ok) throw new Error(`could not fetch the PDF again (HTTP ${res.status})`);
              return res.arrayBuffer();
            });
      const doc = await pdfjs.getDocument({ data: bytes }).promise;
      for (const n of targets) {
        if (mine !== run.current) return;
        setStatus({ text: `Enhancing ${listPages([n])} (${done.length + failed.length + 1} of ${targets.length})…` });
        try {
          const res = await fetch(ocr.enhance.endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ page: n, imageBase64: await renderPage(doc, n) }),
          });
          const out = (await res.json().catch(() => ({ error: `HTTP ${res.status}` }))) as { html?: string; error?: string };
          if (!res.ok || out.error) throw new Error(out.error || `HTTP ${res.status}`);
          if (mine !== run.current) return;
          const section = `<section class="ocr-page" id="page-${n}">${numbered ? ` [${n}] ` : ''}${out.html ?? ''}</section>`;
          current = placePage(current, n, section);
          setResult(current);
          done.push(n);
        } catch (err) {
          console.error(`OCR of page ${n} failed:`, err);
          failed.push(n);
        }
      }
      if (mine !== run.current) return;
      const parts: string[] = [];
      if (done.length) parts.push(`Enhanced ${listPages(done)} with OCR.`);
      if (failed.length) parts.push(`OCR failed for ${listPages(failed)}; the text-layer version is kept.`);
      setStatus({ text: parts.join(' '), error: failed.length > 0 && !done.length });
    } catch (err) {
      if (mine === run.current) setStatus({ text: `OCR enhancement failed: ${(err as Error).message}`, error: true });
    }
  };

  const html = result ? (result.pages ? result.pages.join('') : result.out.html) + result.appended.join('') : '';

  return (
    <div>
      <form className="panel" onSubmit={submit}>
        <label
          className={`drop${over ? ' over' : ''}`}
          onDragEnter={(e) => (e.preventDefault(), setOver(true))}
          onDragOver={(e) => (e.preventDefault(), setOver(true))}
          onDragLeave={(e) => (e.preventDefault(), setOver(false))}
          onDrop={onDrop}
        >
          <input
            ref={fileInput}
            type="file"
            accept="application/pdf,.pdf"
            hidden
            onChange={(e) => chooseFile(e.target.files?.[0] ?? null)}
          />
          <span>
            {file ? (
              `${file.name} (${(file.size / 1048576).toFixed(1)} MB)`
            ) : (
              <>
                Drop a PDF here or <u>choose a file</u>
                {maxMb ? ` (max ${maxMb} MB)` : ''}
              </>
            )}
          </span>
        </label>
        <div className="or">or</div>
        <input
          type="url"
          placeholder="https://arxiv.org/pdf/1706.03762"
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            if (e.target.value) {
              setFile(null);
              if (fileInput.current) fileInput.current.value = '';
            }
          }}
        />
        <div className="row">
          <label>
            <input type="checkbox" checked={addPageNumbers} onChange={(e) => setAddPageNumbers(e.target.checked)} /> Page
            number markers
          </label>
          <label>
            <input type="checkbox" checked={addCitation} onChange={(e) => setAddCitation(e.target.checked)} /> Detect title
            and author
          </label>
          <span className="spacer" />
          <button className="primary" type="submit" disabled={busy}>
            Convert
          </button>
        </div>
      </form>

      <div className={`status${status.error ? ' err' : ''}`} role="status">
        {status.text}
      </div>

      {result && (
        <ResultView
          html={html}
          fileName={safeFileName(result.out.title || result.out.source)}
          meta={
            <>
              {result.out.title && <strong>{result.out.title}</strong>}
              {result.out.title && ' · '}
              {result.out.author && `${result.out.author} · `}
              {(result.out.bytes / 1048576).toFixed(2)} MB in {result.out.ms} ms
            </>
          }
        />
      )}

      <p className="api-note">
        API: <code>POST /api/convert</code> with a <code>file</code> form field, JSON <code>{'{"url": "…"}'}</code>, or a
        raw PDF body. Or <code>GET /api/convert?url=…</code>. See <a href="/docs/live-demo">the demo docs</a>.
      </p>
    </div>
  );
}

/** Puts an OCR'd page in place of its text-layer version, or after the rest. */
function placePage(result: Result, n: number, section: string): Result {
  if (result.pages && result.pages[n - 1] !== undefined) {
    const pages = result.pages.slice();
    pages[n - 1] = section;
    return { ...result, pages };
  }
  return { ...result, appended: [...result.appended, section] };
}

/**
 * Each page opens with `<p id="page-N">`; later paragraphs of the page carry
 * other ids, so a page starts where the next page number first appears.
 */
function splitPages(html: string, count: number | undefined): string[] | null {
  const starts: number[] = [];
  let next = 1;
  for (const match of html.matchAll(/<p id="page-(\d+)">/g)) {
    if (Number(match[1]) === next) {
      starts.push(match.index ?? 0);
      next++;
    }
  }
  if (!count || starts.length !== count || starts[0] !== 0) return null;
  return starts.map((start, i) => html.slice(start, i + 1 < starts.length ? starts[i + 1] : html.length));
}

function listPages(nums: number[]): string {
  return nums.length === 1 ? `page ${nums[0]}` : `pages ${nums.slice(0, -1).join(', ')} and ${nums[nums.length - 1]}`;
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Renders one page to a PNG (longest side at most 2000px) as base64. */
async function renderPage(doc: PdfDocument, n: number): Promise<string> {
  const page = await doc.getPage(n);
  const base = page.getViewport({ scale: 1 });
  const viewport = page.getViewport({ scale: Math.min(2, 2000 / Math.max(base.width, base.height)) });
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  const context = canvas.getContext('2d');
  if (!context) throw new Error('This browser has no 2D canvas.');
  await page.render({ canvasContext: context, viewport }).promise;
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('Could not encode the page image.');
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
  return dataUrl.split(',')[1] ?? '';
}
