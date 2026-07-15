export const dynamic = 'force-dynamic';

import type { Metadata, Viewport } from 'next';
import './globals.css';
import 'shadcn-theme-menu/themes.css';
import { cookies } from "next/headers"
import { cn } from '@/lib/utils';
import { APP_NAME } from '@/lib/config/site';
import { Providers } from '@/components/layout/Providers';

export const metadata: Metadata = {
  title: APP_NAME + ' - Reimagine the Web as a Self-Organizing Mind Map',
  description:
    "Search, extract, vectorize, outline graph, and monitor the web for a topic",
  icons: {
    icon: '/favicon.ico',
    apple: '/icons/apple-touch-icon.png'
  },
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const theme = cookieStore.get("color-theme")?.value || "modern-minimal"

  return (
    <html lang="en" suppressHydrationWarning className={`theme-${theme}`}>
      <head>
        <script dangerouslySetInnerHTML={{
          __html: `var __name = function(fn, name) { Object.defineProperty(fn, 'name', { value: name, configurable: true }); return fn; };`
        }} />
        <script dangerouslySetInnerHTML={{
          __html: `(function(){function apply(){try{var f=localStorage.getItem('fontFamily');var v=f&&f!=='system-default'?f:'';document.documentElement.style.fontFamily=v;if(document.body)document.body.style.fontFamily=v;}catch(e){}}apply();window.addEventListener('client-config-changed',apply);window.addEventListener('storage',apply);})();`
        }} />
      </head>
      <body className={cn('h-full', 'font-sans')}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
