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
  title: 'Live demo — extract-pdf, extract-webpage + extract-cite',
  description:
    'Convert a PDF to structured HTML with an optional Granite Docling OCR follow-up, extract a webpage’s main content and citation, or build a full APA citation with an LLM, on Cloudflare Workers.',
};

export default function DemoPage() {
  return <DemoMount />;
}
