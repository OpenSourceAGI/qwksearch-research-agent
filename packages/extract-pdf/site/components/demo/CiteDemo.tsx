/**
 * The extract-cite half of the demo: a URL (or pasted HTML) through
 * `POST /api/cite`, which runs extract-cite's regex pass and then one LLM call
 * (OpenRouter by default) that completes the APA parts, scores every one, flags
 * the doubtful ones for review and reads the authors' qualifications. The same
 * call checks the extracted article: full text or paywall stub, and which
 * header, nav, sidebar and footer blocks to cut for readability.
 *
 * The API key is typed here and sent with the request; it is not stored. When
 * the Worker has its own OPENROUTER_API_KEY (`/api/health` → `cite`) the field
 * is optional.
 */
import { useRef, useState, type FormEvent } from 'react';

import type { CiteResponse } from '../../worker/api';
import type { CitationField, CitationStyle, ContentCheck, ContentVerdict } from 'extract-cite';

const STYLES: { id: CitationStyle; label: string }[] = [
  { id: 'apa', label: 'APA 7' },
  { id: 'mla', label: 'MLA 9' },
  { id: 'chicago', label: 'Chicago' },
  { id: 'harvard', label: 'Harvard' },
  { id: 'ieee', label: 'IEEE' },
  { id: 'bibtex', label: 'BibTeX' },
];

/** Different kinds of source, so the demo shows what each one gives the model. */
const EXAMPLES: { group: string; items: { label: string; url: string; note?: string }[] }[] = [
  {
    group: 'News',
    items: [
      {
        label: 'New York Times',
        url: 'https://www.nytimes.com/interactive/2024/01/09/climate/2023-hottest-year-on-record.html',
        note: 'The Times blocks many server fetches: if this fails, open the page, view source and use Paste HTML.',
      },
      { label: 'NPR', url: 'https://www.npr.org/2023/12/28/1221827923/2023-hottest-year-record-climate-change' },
      { label: 'Scientific American', url: 'https://www.scientificamerican.com/article/2023-was-the-hottest-year-on-record-by-a-long-shot/' },
    ],
  },
  {
    group: 'Academic',
    items: [
      { label: 'arXiv paper', url: 'https://arxiv.org/abs/1706.03762' },
      { label: 'Nature article', url: 'https://www.nature.com/articles/s41586-021-03819-2' },
    ],
  },
  {
    group: 'Organizations and reference',
    items: [
      { label: 'WHO fact sheet', url: 'https://www.who.int/news-room/fact-sheets/detail/climate-change-and-health' },
      { label: 'Wikipedia (no author)', url: 'https://en.wikipedia.org/wiki/Web_scraping' },
      { label: 'Essay blog', url: 'https://paulgraham.com/greatwork.html' },
    ],
  },
];

const FIELD_LABEL: Record<CitationField, string> = {
  authors: 'Authors',
  title: 'Title',
  containerTitle: 'Site / publication',
  publisher: 'Publisher',
  publishedDate: 'Published',
  doi: 'DOI',
  volume: 'Volume',
  issue: 'Issue',
  pages: 'Pages',
};

/** OpenRouter's free-model router, so the demo works without spending credit. */
const DEFAULT_MODEL = 'openrouter/free';

const ORIGIN_LABEL = { regex: 'regex', llm: 'LLM', both: 'regex + LLM' } as const;

const VERDICT_LABEL: Record<ContentVerdict, string> = {
  full: 'Full article',
  paywalled: 'Paywalled',
  truncated: 'Truncated',
  blocked: 'Blocked',
  'not-article': 'Not an article',
  unknown: 'Not checked',
};

/** The checked selectors as an entry for extract-webpage's extract-selectors-per-domain.json. */
function domainRule(check: ContentCheck, url?: string): string {
  let domain = 'example.com';
  try {
    if (url) domain = new URL(url).hostname.replace(/^www\./, '');
  } catch {
    // Pasted HTML with no URL: keep the placeholder.
  }
  return JSON.stringify({ [domain]: check.selectors }, null, 2);
}

/** Is the extracted text the whole article, and what clutter is left in it. */
function ContentCheckPanel({ check, url }: { check: ContentCheck; url?: string }) {
  const bad = !check.isFullContent && check.verdict !== 'unknown';
  return (
    <section className={`content-check${bad ? ' bad' : ''}`}>
      <h3>
        Content check: <span className="verdict">{VERDICT_LABEL[check.verdict]}</span>
        <span className="hint">
          {' '}
          · {Math.round(check.confidence * 100)}% · first {check.wordsChecked} words checked
        </span>
      </h3>
      {check.note && <p>{check.note}</p>}
      {check.signals.length > 0 && (
        <ul className="signals">
          {check.signals.map((signal) => (
            <li key={signal}>“{signal}”</li>
          ))}
        </ul>
      )}
      {check.tips.length > 0 && (
        <table className="cite-parts">
          <thead>
            <tr>
              <th>Cut</th>
              <th>Selector</th>
              <th>Tip</th>
            </tr>
          </thead>
          <tbody>
            {check.tips.map((tip, i) => (
              <tr key={i}>
                <td>{tip.region}</td>
                <td>{tip.selector ? <code>{tip.selector}</code> : <em>none on the page</em>}</td>
                <td>
                  {tip.tip}
                  {tip.example && <div className="hint">“{tip.example}”</div>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {check.contentSelector && (
        <p className="hint">
          Article body: <code>{check.contentSelector}</code>
        </p>
      )}
      {(check.selectors.content.length > 0 || check.selectors.remove.length > 0) && (
        <details>
          <summary>As a rule for extract-webpage’s per-domain selectors</summary>
          <pre>
            <code>{domainRule(check, url)}</code>
          </pre>
        </details>
      )}
    </section>
  );
}

function valueOf(result: CiteResponse, field: CitationField): string {
  if (field === 'authors') return result.citation.authors.map((a) => a.name).join('; ');
  return result.citation[field] ?? '';
}

export function CiteDemo({ serverKey }: { serverKey: boolean }) {
  const [mode, setMode] = useState<'url' | 'html'>('url');
  const [url, setUrl] = useState('');
  const [html, setHtml] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState(DEFAULT_MODEL);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ text: string; error?: boolean }>({ text: '' });
  const [note, setNote] = useState('');
  const [result, setResult] = useState<CiteResponse | null>(null);
  const [style, setStyle] = useState<CitationStyle>('apa');
  const [copied, setCopied] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (mode === 'url' && !url.trim()) return setStatus({ text: 'Paste a URL or pick an example.', error: true });
    if (mode === 'html' && !html.trim()) return setStatus({ text: 'Paste some HTML.', error: true });
    if (!apiKey.trim() && !serverKey) return setStatus({ text: 'Paste an OpenRouter API key.', error: true });

    const controller = new AbortController();
    abortRef.current = controller;
    setBusy(true);
    setStatus({ text: 'Reading the page, then asking the model…' });
    try {
      const res = await fetch('/api/cite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          url: url.trim() || undefined,
          html: mode === 'html' ? html : undefined,
          apiKey: apiKey.trim() || undefined,
          model: model.trim() || undefined,
        }),
      });
      const out = (await res.json().catch(() => ({ error: `HTTP ${res.status}` }))) as CiteResponse & { error?: string };
      if (!res.ok || out.error) throw new Error(out.error || `HTTP ${res.status}`);
      setResult(out);
      setStatus({ text: '' });
    } catch (err) {
      if (controller.signal.aborted) setStatus({ text: 'Cancelled.' });
      else setStatus({ text: (err as Error).message, error: true });
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      setBusy(false);
    }
  };

  const cancel = () => abortRef.current?.abort();

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // Clipboard blocked: nothing to do.
    }
  };

  const review = new Set(result?.needsReview.map((item) => item.field));
  const formatted = result?.formatted[style];

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

        {EXAMPLES.map((group) => (
          <div key={group.group} className="examples">
            <span className="examples-label">{group.group}</span>
            {group.items.map((item) => (
              <button
                key={item.url}
                type="button"
                className="ghost"
                title={item.note || item.url}
                onClick={() => {
                  setUrl(item.url);
                  setMode('url');
                  setNote(item.note || '');
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
        ))}

        <input
          type="url"
          placeholder={mode === 'url' ? 'https://www.nytimes.com/…' : 'Page URL (optional): fills in the citation’s link'}
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            setNote('');
          }}
        />
        {note && <p className="hint">{note}</p>}
        {mode === 'html' && (
          <textarea placeholder="<html>…</html>" rows={6} value={html} onChange={(e) => setHtml(e.target.value)} spellCheck={false} />
        )}

        <div className="row">
          <input
            type="password"
            autoComplete="off"
            placeholder={serverKey ? 'OpenRouter API key (optional here)' : 'OpenRouter API key (sk-or-…)'}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
          />
          <input type="text" placeholder="Model (default openrouter/free)" value={model} onChange={(e) => setModel(e.target.value)} />
          {busy && (
            <button className="ghost" type="button" onClick={cancel}>
              Cancel
            </button>
          )}
          <button className="primary" type="submit" disabled={busy}>
            Cite
          </button>
        </div>
        <p className="hint">
          The key is sent with this one request to call OpenRouter and is not stored.
          {serverKey ? ' This site also has a key of its own, used when the field is empty.' : ''}
        </p>
      </form>

      <div className={`status${status.error ? ' err' : ''}`} role="status">
        {status.text}
      </div>

      {result && (
        <>
          <section className="result">
            <div className="bar">
              <div className="meta">
                <strong>{result.citation.title || result.input}</strong> · {Math.round(result.overallConfidence * 100)}% overall ·{' '}
                {result.model} · {result.ms} ms
              </div>
              <div className="segmented" role="tablist" aria-label="Citation style">
                {STYLES.map((s) => (
                  <button key={s.id} type="button" role="tab" aria-selected={style === s.id} onClick={() => setStyle(s.id)}>
                    {s.label}
                  </button>
                ))}
              </div>
              <button className="ghost" type="button" onClick={() => formatted && copy(formatted.text)}>
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            {/* `html` is escaped by extract-cite except for its own <i> tags. */}
            {formatted && <p className="citation" dangerouslySetInnerHTML={{ __html: formatted.html }} />}
          </section>

          <table className="cite-parts">
            <thead>
              <tr>
                <th>Part</th>
                <th>Value</th>
                <th>Confidence</th>
                <th>Found by</th>
              </tr>
            </thead>
            <tbody>
              {(Object.keys(FIELD_LABEL) as CitationField[])
                .filter((field) => valueOf(result, field) || review.has(field))
                .map((field) => {
                  const confidence = result.confidence[field];
                  const item = result.needsReview.find((r) => r.field === field);
                  return (
                    <tr key={field} className={review.has(field) ? 'review' : undefined}>
                      <td>{FIELD_LABEL[field]}</td>
                      <td>
                        {valueOf(result, field) || <em>not found</em>}
                        {item && <div className="flag">Review: {item.reason}</div>}
                      </td>
                      <td>
                        <meter min={0} max={1} low={0.5} high={0.7} optimum={1} value={confidence} /> {Math.round(confidence * 100)}%
                      </td>
                      <td>{result.origin[field] ? ORIGIN_LABEL[result.origin[field]!] : ''}</td>
                    </tr>
                  );
                })}
            </tbody>
          </table>

          {result.contentCheck && <ContentCheckPanel check={result.contentCheck} url={result.citation.url} />}

          {result.citation.authors.some((a) => a.qualifications) && (
            <dl className="cite">
              {result.citation.authors
                .filter((a) => a.qualifications)
                .map((a) => {
                  const q = a.qualifications!;
                  return (
                    <div key={a.name}>
                      <dt>{a.name}</dt>
                      <dd>
                        {[q.jobTitle, q.affiliation, q.credentials?.join(', '), q.expertise && `expert in ${q.expertise.join(', ')}`]
                          .filter(Boolean)
                          .join(' · ')}
                        {q.evidence && <blockquote>{q.evidence}</blockquote>}
                      </dd>
                    </div>
                  );
                })}
            </dl>
          )}

          <details>
            <summary>What the regex pass found before the model ran</summary>
            <pre>
              <code>{JSON.stringify({ found: result.partial, askedModelFor: result.missing }, null, 2)}</code>
            </pre>
          </details>
        </>
      )}

      <p className="api-note">
        API: <code>POST /api/cite</code> with JSON <code>{'{"url": "…", "apiKey": "…", "model": "…"}'}</code>. In code:{' '}
        <code>extractCiteLLM({'{ url, apiKey, model }'})</code> from <code>extract-cite</code>. See{' '}
        <a href="/docs/live-demo">the demo docs</a>.
      </p>
    </div>
  );
}
