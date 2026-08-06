'use client';

import { useEffect, useState } from 'react';
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
import { CookieConsent } from '@/components/layout/CookieConsent';
import { useChunkErrorReload } from '@/components/layout/useChunkErrorReload';
import { SettingsModalProvider } from '@/components/Settings/SettingsModal';
import { MainViewProvider } from '@/components/layout/MainViewProvider';
import { config, listFooterLinks } from '@/lib/config/site';

configureResearchAgentUI({
  appName: config.appName,
  defaultSummarizePrompt: config.defaultSummarizePrompt,
  maxArticleLength: config.maxArticleLength,
  downloadChromeUrl: config.downloadChromeUrl,
  downloadWindowsStoreId: config.downloadWindowsStoreId,
  footerLinks: listFooterLinks,
  googleApiKey: process.env.NEXT_PUBLIC_GOOGLE_API_KEY || '',
  getAutoMediaSearch: () => true,
});

export function Providers({ children }: { children: React.ReactNode }) {
  // Google One Tap should only be prompted when the backend actually has the
  // Google provider configured — otherwise the prompt can only fail (a
  // sign-in with no provider to complete it against).
  const [googleOneTapEnabled, setGoogleOneTapEnabled] = useState(false);

  useChunkErrorReload();

  useEffect(() => {
    fetch('/api/auth/providers')
      .then((res) => res.json())
      .then((data) => setGoogleOneTapEnabled(!!data.providers?.includes('google')))
      .catch(() => setGoogleOneTapEnabled(false));
  }, []);

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <SessionProvider authClient={authClient} enableGoogleOneTap={googleOneTapEnabled}>
        <ExtractPanelProvider>
          <ChatProvider>
            <CategoryDockProvider>
              <SettingsModalProvider>
                <MainViewProvider>
                  <div className="w-screen h-screen overflow-auto pb-[calc(60px+env(safe-area-inset-bottom,0px))] md:pb-0">
                    <CategoryDock />
                    <main className="bg-light-primary dark:bg-dark-primary min-h-screen">
                      {children}
                    </main>
                  </div>
                </MainViewProvider>
              </SettingsModalProvider>
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
            <CookieConsent />
          </ChatProvider>
        </ExtractPanelProvider>
      </SessionProvider>
    </ThemeProvider>
  );
}
