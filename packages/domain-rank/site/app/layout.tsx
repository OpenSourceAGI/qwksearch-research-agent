import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { docsConfig } from '@/lib/fumadocs/customize-docs';
import { Provider } from './provider';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: `${docsConfig.title} — offline domain rank lookup`,
    template: `%s`,
  },
  description: docsConfig.description,
  icons: {
    icon: { url: '/icon.svg', type: 'image/svg+xml' },
  },
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
