/**
 * @file page.tsx
 * @description `/demo`: the live demo, inside the docs site's own nav.
 *
 * The demo is a client-only React app (components/demo); its API is
 * `worker/api.ts`, served by this site's Worker at `/api/*`.
 */
import type { Metadata } from 'next';
import { DemoMount } from '@/components/demo/DemoMount';
import '@/components/demo/demo.css';

export const metadata: Metadata = {
  title: 'Live demo — extract-pdf + extract-webpage',
  description:
    'Convert a PDF to structured HTML with an optional Granite Docling OCR follow-up, or extract a webpage’s main content and citation, on Cloudflare Workers.',
};

export default function DemoPage() {
  return <DemoMount />;
}
