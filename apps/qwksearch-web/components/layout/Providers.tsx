'use client';

// Import-order markers — see lib/debug/marks/README.md. `research-agent-ui`
// and the Better Auth client are the two module graphs in this file big enough
// to fail while being evaluated, which is the failure that costs the whole
// page a 500 rather than a subtree. A `:begin` with no `:end` names the one
// that threw.
import '@/lib/debug/marks/research-agent-ui-begin';
import { QwkSearchProviders } from 'research-agent-ui';
import '@/lib/debug/marks/research-agent-ui-end';
import '@/lib/debug/marks/auth-client-begin';
import { authClient } from '@/lib/auth/client';
import '@/lib/debug/marks/auth-client-end';
import { SettingsModalProvider } from '@/components/Settings/SettingsModal';
import { config, listFooterLinks } from '@/lib/config/site';
import { traceSsr } from '@/lib/debug/ssr-trace';

/**
 * The app's root providers. The stack itself — theming, session, chat,
 * dock, cookie banner, the research/docs view switch — lives in
 * `research-agent-ui` so the desktop app, the extension, and any external
 * consumer mount the same shell. This file supplies only what is specific
 * to the web app: its auth client, its site config, and its settings modal.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  traceSsr('providers:render', {
    hasAuthClient: Boolean(authClient),
    baseUrl: config.baseUrl,
  });

  return (
    <QwkSearchProviders
      authClient={authClient}
      ChromeProvider={SettingsModalProvider}
      config={{
        appName: config.appName,
        defaultSummarizePrompt: config.defaultSummarizePrompt,
        maxArticleLength: config.maxArticleLength,
        downloadChromeUrl: config.downloadChromeUrl,
        downloadWindowsStoreId: config.downloadWindowsStoreId,
        footerLinks: listFooterLinks,
        googleApiKey: process.env.NEXT_PUBLIC_GOOGLE_API_KEY || '',
        // Cloud project number the Drive picker identifies this app by. It is
        // the numeric prefix of the OAuth client ID, so it needs no separate
        // secret.
        googleAppId:
          process.env.NEXT_PUBLIC_GOOGLE_APP_ID ||
          config.googleClientId.split('-')[0],
        getAutoMediaSearch: () => true,
      }}
    >
      {children}
    </QwkSearchProviders>
  );
}

traceSsr('module:components/layout/Providers');
