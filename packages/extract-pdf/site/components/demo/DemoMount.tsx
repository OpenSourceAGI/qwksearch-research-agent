'use client';

/**
 * The live demo: two tabs, **PDF** (extract-pdf) and **Webpage**
 * (extract-webpage), both talking to this site's Worker at `/api/*`
 * (`worker/api.ts`). The tab follows the URL hash (`/demo#webpage`), so a
 * link can open either one.
 *
 * Client-only: it reads the hash and the drag-and-drop file on first render,
 * so the server ships a placeholder and the demo replaces it once hydrated.
 */
import { useEffect, useState } from 'react';

import type { HealthResponse } from '../../worker/api';
import { PdfDemo } from './PdfDemo';
import { WebpageDemo } from './WebpageDemo';

type Tab = 'pdf' | 'webpage';

function tabFromHash(): Tab {
  return window.location.hash === '#webpage' ? 'webpage' : 'pdf';
}

export function DemoMount() {
  const [tab, setTab] = useState<Tab | null>(null);
  const [health, setHealth] = useState<HealthResponse | null>(null);

  useEffect(() => {
    setTab(tabFromHash());
    const onHash = () => setTab(tabFromHash());
    window.addEventListener('hashchange', onHash);
    fetch('/api/health')
      .then((res) => (res.ok ? (res.json() as Promise<HealthResponse>) : null))
      .then(setHealth)
      .catch(() => setHealth(null));
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const select = (next: Tab) => {
    setTab(next);
    window.history.replaceState(null, '', next === 'webpage' ? '#webpage' : window.location.pathname);
  };

  return (
    <div className="epd-demo">
      <main className="page">
        <header className="header">
          <h1>Live demo</h1>
          <p>
            PDFs and webpages to clean, structured HTML, on the Cloudflare Worker that serves these docs. A PDF's text
            layer comes back at once; pages that look scanned or hold tables and figures can then be enhanced with
            Granite Docling OCR. A webpage comes back as its main content with the citation fields found on the page.
          </p>
        </header>

        <div className="tabs" role="tablist" aria-label="Demo">
          <button type="button" role="tab" aria-selected={tab === 'pdf'} onClick={() => select('pdf')}>
            PDF · extract-pdf
          </button>
          <button type="button" role="tab" aria-selected={tab === 'webpage'} onClick={() => select('webpage')}>
            Webpage · extract-webpage
          </button>
        </div>

        {tab === null ? (
          <p className="status">Loading the live demo…</p>
        ) : tab === 'pdf' ? (
          <PdfDemo maxMb={health?.maxPdfMb ?? null} />
        ) : (
          <WebpageDemo />
        )}
      </main>
    </div>
  );
}
