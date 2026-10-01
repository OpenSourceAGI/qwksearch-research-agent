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
  title: 'Live demo — extract-youtube',
  description:
    'A video library grid, list and admin screens over the extract-youtube library API, a floating YouTube player with synced captions, and a Storybook of every component.',
};

export default function DemoPage() {
  return <DemoMount />;
}
