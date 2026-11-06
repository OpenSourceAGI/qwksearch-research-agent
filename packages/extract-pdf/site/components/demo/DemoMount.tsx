'use client';

/**
 * The live demo: four tabs, **PDF** (extract-pdf), **Webpage**
 * (extract-webpage), **Citation** (extract-cite) and **YouTube**
 * (extract-youtube), all talking to this site's Worker at `/api/*`
 * (`worker/api.ts`). The tab follows the URL hash (`/demo#webpage`,
 * `/demo#youtube`, `/demo#youtube-admin`), so a link can open any one.
 *
 * Client-only: it reads the hash and the drag-and-drop file on first render,
 * so the server ships a placeholder and the demo replaces it once hydrated.
 */
import { useEffect, useState } from 'react';

import type { HealthResponse } from '../../worker/api';
import { CiteDemo } from './CiteDemo';
import { PdfDemo } from './PdfDemo';
import { WebpageDemo } from './WebpageDemo';
import { YouTubeDemo } from './youtube/YouTubeDemo';

type Tab = 'pdf' | 'webpage' | 'cite' | 'youtube';

function tabFromHash(): Tab {
  if (window.location.hash === '#cite') return 'cite';
  if (window.location.hash.startsWith('#youtube')) return 'youtube';
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
    window.history.replaceState(null, '', next === 'pdf' ? window.location.pathname : `#${next}`);
  };

  return (
    <main>
      <div className="epd-demo">
        <div className={tab === 'youtube' ? 'page wide' : 'page'}>
          <header className="header">
            <h1>Live demo</h1>
            <p>
              PDFs and webpages to clean, structured HTML, on the same server as these docs. A PDF's text
              layer comes back at once; pages that look scanned or hold tables and figures can then be enhanced with
              Granite Docling OCR. A webpage comes back as its main content with the citation fields found on the page. The Citation tab goes further: an LLM completes the full APA citation, scores each part, flags what needs review, and reads the author’s qualifications. The YouTube tab is a video library with a floating player and captions synced from each video’s transcript.
            </p>
          </header>

          <div className="tabs" role="tablist" aria-label="Demo">
            <button type="button" role="tab" aria-selected={tab === 'pdf'} onClick={() => select('pdf')}>
              PDF · extract-pdf
            </button>
            <button type="button" role="tab" aria-selected={tab === 'webpage'} onClick={() => select('webpage')}>
              Webpage · extract-webpage
            </button>
            <button type="button" role="tab" aria-selected={tab === 'cite'} onClick={() => select('cite')}>
              Citation · extract-cite
            </button>
            <button type="button" role="tab" aria-selected={tab === 'youtube'} onClick={() => select('youtube')}>
              YouTube · extract-youtube
            </button>
          </div>

          {tab === null ? (
            <p className="status">Loading the live demo…</p>
          ) : tab === 'pdf' ? (
            <PdfDemo maxMb={health?.maxPdfMb ?? null} ocr={health?.ocr ?? false} />
          ) : tab === 'webpage' ? (
            <WebpageDemo />
          ) : tab === 'cite' ? (
            <CiteDemo serverKey={health?.cite ?? false} />
          ) : null}
        </div>
      </div>
      {tab === 'youtube' && <YouTubeDemo />}
    </main>
  );
}
