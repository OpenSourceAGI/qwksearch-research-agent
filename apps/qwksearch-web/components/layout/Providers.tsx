'use client';

import {
  ChatProvider,
  SessionProvider,
  ExtractPanelProvider,
  configureResearchAgentUI,
} from 'research-agent-ui';
import { ThemeProvider } from 'shadcn-theme-menu';
import { CategoryDockProvider } from 'shadcn-app-dock';
import { Toaster } from 'sonner';
import { authClient } from '@/lib/auth/client';
import { CategoryDock } from '@/components/layout/CategoryDock';
import {
  APP_NAME,
  DEFAULT_SUMMARIZE_PROMPT,
  MAX_ARTICLE_LENGTH,
  DOWNLOAD_CHROME_URL,
  DOWNLOAD_WINDOWS_STORE_ID,
  listFooterLinks,
} from '@/lib/config/site';

configureResearchAgentUI({
  appName: APP_NAME,
  defaultSummarizePrompt: DEFAULT_SUMMARIZE_PROMPT,
  maxArticleLength: MAX_ARTICLE_LENGTH,
  downloadChromeUrl: DOWNLOAD_CHROME_URL,
  downloadWindowsStoreId: DOWNLOAD_WINDOWS_STORE_ID,
  footerLinks: listFooterLinks,
  googleApiKey: process.env.NEXT_PUBLIC_GOOGLE_API_KEY || '',
  getAutoMediaSearch: () => true,
});

export function Providers({ children }: { children: React.ReactNode }) {
  return (
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
  );
}
