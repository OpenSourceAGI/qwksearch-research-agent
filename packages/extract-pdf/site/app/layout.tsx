/**
 * @file layout.tsx
 * @description Root layout. Uses the system font stack (see globals.css)
 * rather than `next/font/google`, so nothing is fetched from Google at build
 * or request time.
 */
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { docsConfig } from '@/lib/fumadocs/customize-docs';
import { Provider } from './provider';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: `${docsConfig.title} — PDFs and webpages to clean HTML`,
    template: `%s`,
  },
  description: docsConfig.description,
  icons: {
    icon: { url: '/icon.svg', type: 'image/svg+xml' },
  },
  manifest: '/manifest.webmanifest',
};

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="flex min-h-screen flex-col">
        <Provider>{children}</Provider>
      </body>
    </html>
  );
}
