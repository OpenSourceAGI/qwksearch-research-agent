export const dynamic = 'force-dynamic';

import type { Metadata, Viewport } from 'next';
import './globals.css';
import 'shadcn-theme-menu/themes.css';
import { cookies } from "next/headers"
import { cn } from '@/lib/utils';
import { Toaster } from 'sonner';
import { ChatProvider } from '@/components/ResearchAgent/hooks/useChat';
import { SessionProvider } from '@/components/ResearchAgent/hooks/useSession';
import { ThemeProvider } from "shadcn-theme-menu";
import { FontProvider } from "@/components/layout/font-provider";
import { ExtractPanelProvider } from '@/components/ResearchAgent/components/ArticleReader/ExtractPanelContext';
import { APP_NAME } from '@/lib/config/site';
import { CategoryDock } from '@/components/layout/CategoryDock';
import { CategoryDockProvider } from '@/components/layout/category-dock-context';
import { OneTap } from '@/components/layout/OneTap';

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
          __html: `(function(){try{var f=localStorage.getItem('fontFamily');if(f&&f!=='system-default')document.documentElement.style.fontFamily=f;}catch(e){}})();`
        }} />
      </head>
      <body className={cn('h-full', 'font-sans')}>
        <FontProvider />
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <SessionProvider>
            <OneTap />
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
