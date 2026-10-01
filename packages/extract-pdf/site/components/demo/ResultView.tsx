/**
 * The result panel both demos share: a line of metadata, the HTML rendered in
 * a sandboxed iframe (no scripts, no same-origin access) or shown as source,
 * and Copy / Download buttons.
 */
import { useState, type ReactNode } from 'react';

/** Reader styles for the iframe: the extracted HTML carries none of its own. */
const READER_CSS =
  'body{font:16px/1.6 Georgia,serif;max-width:720px;margin:24px auto;padding:0 16px;color:#1d1d1b}' +
  'img{max-width:100%;height:auto}pre{background:#f3f3f0;padding:12px;overflow:auto}' +
  '.ocr-page{border-left:3px solid #2f5bd3;padding-left:12px}' +
  'table{border-collapse:collapse}td,th{border:1px solid #ccc;padding:2px 6px}';

export function ResultView({ html, fileName, meta }: { html: string; fileName: string; meta: ReactNode }) {
  const [showSource, setShowSource] = useState(false);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(html);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // Clipboard blocked (insecure origin, permissions): nothing to do.
    }
  };

  const download = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
    a.download = `${fileName}.html`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <section className="result">
      <div className="bar">
        <div className="meta">{meta}</div>
        <button className="ghost" type="button" onClick={() => setShowSource(!showSource)}>
          {showSource ? 'View rendered' : 'View HTML source'}
        </button>
        <button className="ghost" type="button" onClick={copy}>
          {copied ? 'Copied' : 'Copy HTML'}
        </button>
        <button className="ghost" type="button" onClick={download}>
          Download
        </button>
      </div>
      {showSource ? (
        <pre>
          <code>{html}</code>
        </pre>
      ) : (
        <iframe
          sandbox=""
          title="Converted HTML preview"
          srcDoc={`<!doctype html><meta charset=utf-8><style>${READER_CSS}</style>${html}`}
        />
      )}
    </section>
  );
}

/** A filesystem-safe name for a download, from a title or a URL. */
export function safeFileName(value: string | undefined): string {
  return (value || 'document').replace(/[^\w.-]+/g, '_').slice(0, 60) || 'document';
}
