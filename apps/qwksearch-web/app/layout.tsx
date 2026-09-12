export const dynamic = 'force-dynamic';

import type { Metadata, Viewport } from 'next';
import './globals.css';
import 'shadcn-theme-menu/themes.css';
import { cookies } from "next/headers"
import { cn } from '@/lib/utils';
import { config } from '@/lib/config/site';
// Import-order markers around `Providers`: it pulls the whole
// `research-agent-ui` shell into the root layout, so a module-scope `document`
// read anywhere in that graph throws while *this* module is being evaluated —
// before React has a boundary — and answers every route with a 500. A
// `layout:import:providers:begin` with no matching `:end` in the log says that
// is what happened. See lib/debug/marks/README.md.
import '@/lib/debug/marks/layout-providers-begin';
import { Providers } from '@/components/layout/Providers';
import '@/lib/debug/marks/layout-providers-end';
import { logSsrError, traceSsr } from '@/lib/debug/ssr-trace';

export const metadata: Metadata = {
  title: config.appName + ' - Reimagine the Web as a Self-Organizing Mind Map',
  description:
    "Search, extract, vectorize, outline graph, and monitor the web for a topic",
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png'
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
  traceSsr('layout:render:enter');

  // `cookies()` is a dynamic API: it opts the whole tree out of static
  // rendering and, outside a request scope, throws. Logging the throw here
  // separates "the layout could not read the request" from "something below
  // the layout failed to render", which the bare 500 does not.
  let theme = 'modern-minimal';
  try {
    const cookieStore = await cookies();
    theme = cookieStore.get("color-theme")?.value || "modern-minimal";
    traceSsr('layout:cookies:read', { theme });
  } catch (error) {
    logSsrError('layout:cookies:threw', error);
    throw error;
  }

  // The tree below is returned, not rendered, here: React walks it afterwards.
  // A trace that stops on this line means the failure is in a descendant.
  traceSsr('layout:render:returning-tree');

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

traceSsr('module:app/layout');
