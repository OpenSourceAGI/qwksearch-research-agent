'use client';

/**
 * The live demo: PDF only (extract-pdf), talking to this site's API at `/api/*`.
 * Vercel deployment version - Webpage tab removed.
 */
import { useEffect, useState } from 'react';

import type { HealthResponse } from '../../worker/api';
import { PdfDemo } from './PdfDemo';

export function DemoMount() {
  const [health, setHealth] = useState<HealthResponse | null>(null);

  useEffect(() => {
    fetch('/api/health')
      .then((res) => (res.ok ? (res.json() as Promise<HealthResponse>) : null))
      .then(setHealth)
      .catch(() => setHealth(null));
  }, []);

  return (
    <div className="epd-demo">
      <main className="page">
        <header className="header">
          <h1>Live demo — extract-pdf</h1>
          <p>
            Convert a PDF to clean, structured HTML. A PDF's text layer comes back at once;
            pages that look scanned or hold tables and figures can then be enhanced with
            Granite Docling OCR.
          </p>
        </header>

        {health === null ? (
          <p className="status">Loading the live demo…</p>
        ) : (
          <PdfDemo maxMb={health?.maxPdfMb ?? null} ocr={health?.ocr ?? false} />
        )}
      </main>
    </div>
  );
}