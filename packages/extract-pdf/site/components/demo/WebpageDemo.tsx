/**
 * The extract-webpage half of the demo: a URL (or pasted HTML) through
 * `POST /api/extract`, which runs extract-webpage's `extractContent` on the
 * Worker and answers with the main content as basic HTML plus the citation
 * fields it found: title, author, date, publisher and an APA-style cite.
 *
 * A URL that turns out to be a PDF goes through extract-pdf, and a YouTube URL
 * through extract-youtube's transcript fetcher, both inside `extractContent`.
 */
import { useState, type FormEvent } from 'react';

import type { ExtractResponse } from '../../worker/api';
import { ResultView, safeFileName } from './ResultView';

type Mode = 'url' | 'html';

export function WebpageDemo() {
  const [mode, setMode] = useState<Mode>('url');
  const [url, setUrl] = useState('');
  const [html, setHtml] = useState('');
  const [images, setImages] = useState(true);
  const [links, setLinks] = useState(true);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ text: string; error?: boolean }>({ text: '' });
  const [result, setResult] = useState<ExtractResponse | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (mode === 'url' && !url.trim()) return setStatus({ text: 'Paste a URL.', error: true });
    if (mode === 'html' && !html.trim()) return setStatus({ text: 'Paste some HTML.', error: true });

    setBusy(true);
    setStatus({ text: 'Extracting…' });
    try {
      const body = mode === 'url' ? { url: url.trim(), images, links } : { html, url: url.trim() || undefined, images, links };
      const res = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const out = (await res.json().catch(() => ({ error: `HTTP ${res.status}` }))) as ExtractResponse & { error?: string };
      if (!res.ok || out.error) throw new Error(out.error || `HTTP ${res.status}`);
      setResult(out);
      setStatus({ text: '' });
    } catch (err) {
      setStatus({ text: (err as Error).message, error: true });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <form className="panel" onSubmit={submit}>
        <div className="segmented" role="radiogroup" aria-label="Input">
          <button type="button" role="radio" aria-checked={mode === 'url'} onClick={() => setMode('url')}>
            URL
          </button>
          <button type="button" role="radio" aria-checked={mode === 'html'} onClick={() => setMode('html')}>
            Paste HTML
          </button>
        </div>
        <input
          type="url"
          placeholder={
            mode === 'url'
              ? 'https://en.wikipedia.org/wiki/Web_scraping'
              : 'Page URL (optional): makes links absolute and helps the citation'
          }
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        {mode === 'html' && (
          <textarea
            placeholder="<html>…</html>"
            rows={8}
            value={html}
            onChange={(e) => setHtml(e.target.value)}
            spellCheck={false}
          />
        )}
        <div className="row">
          <label>
            <input type="checkbox" checked={images} onChange={(e) => setImages(e.target.checked)} /> Keep images
          </label>
          <label>
            <input type="checkbox" checked={links} onChange={(e) => setLinks(e.target.checked)} /> Keep links
          </label>
          <span className="spacer" />
          <button className="primary" type="submit" disabled={busy}>
            Extract
          </button>
        </div>
      </form>

      <div className={`status${status.error ? ' err' : ''}`} role="status">
        {status.text}
      </div>

      {result && (
        <>
          <dl className="cite">
            {(
              [
                ['Title', result.title],
                ['Author', result.author],
                ['Date', result.date],
                ['Source', result.source],
                // `cite` is HTML (<b>title</b>, <i>source</i>, a link) built from
                // page values; show it as text rather than trust it as markup.
                ['Citation', result.cite?.replace(/<[^>]+>/g, '')],
                ['Words', result.word_count?.toLocaleString()],
              ] as const
            )
              .filter(([, value]) => value)
              .map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
          </dl>
          <ResultView
            html={result.html}
            fileName={safeFileName(result.title || result.input)}
            meta={
              <>
                {result.title && <strong>{result.title}</strong>}
                {result.title && ' · '}
                extracted in {result.ms} ms
              </>
            }
          />
        </>
      )}

      <p className="api-note">
        API: <code>GET /api/extract?url=…</code>, or <code>POST /api/extract</code> with JSON{' '}
        <code>{'{"url": "…"}'}</code> or <code>{'{"html": "…", "url": "…"}'}</code>. See{' '}
        <a href="/docs/live-demo">the demo docs</a>.
      </p>
    </div>
  );
}
