export const dynamic = 'force-dynamic';

import type { Metadata, Viewport } from 'next';
import './globals.css';
import 'shadcn-theme-menu/themes.css';
import { cookies } from "next/headers"
import { cn } from '@/lib/utils';
import { Toaster } from 'sonner';
import {
  ChatProvider,
  SessionProvider,
  ExtractPanelProvider,
} from 'research-agent-ui';
import { configureResearchAgentUI } from 'research-agent-ui/config';
import { ThemeProvider } from "shadcn-theme-menu";
import {
  APP_NAME,
  DEFAULT_SUMMARIZE_PROMPT,
  MAX_ARTICLE_LENGTH,
  DOWNLOAD_CHROME_URL,
  DOWNLOAD_WINDOWS_STORE_ID,
  listFooterLinks,
} from '@/lib/config/site';
import { getAutoMediaSearch } from '@/lib/config/serverRegistry';
import { authClient } from '@/lib/auth/client';
import { CategoryDock } from '@/components/layout/CategoryDock';
import { CategoryDockProvider } from 'shadcn-app-dock';

configureResearchAgentUI({
  appName: APP_NAME,
  defaultSummarizePrompt: DEFAULT_SUMMARIZE_PROMPT,
  maxArticleLength: MAX_ARTICLE_LENGTH,
  downloadChromeUrl: DOWNLOAD_CHROME_URL,
  downloadWindowsStoreId: DOWNLOAD_WINDOWS_STORE_ID,
  footerLinks: listFooterLinks,
  googleApiKey: process.env.NEXT_PUBLIC_GOOGLE_API_KEY || '',
  getAutoMediaSearch,
});

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
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <SessionProvider authClient={authClient}>
            <ExtractPanelProvider>
              <ChatProvider>
                <CategoryDockProvider>
                  <div className="w-screen h-screen overflow-auto pb-[calc(60px+env(safe-area-inset-bottom,0px))] md:pb-0">
                    <CategoryDock />
                    <main className="bg-light-primary dark:bg-dark-primary min-h-screen">
                      {children}

                    </main>
                  </div>
                </CategoryDockProvider>
                <Toaster
                  toastOptions={{
                    unstyled: true,
                    classNames: {
                      toast:
                        'bg-light-secondary dark:bg-dark-secondary dark:text-white/70 text-black-70 rounded-lg p-4 flex flex-row items-center space-x-2',
                    },
                  }}
                />
              </ChatProvider>
            </ExtractPanelProvider>
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
