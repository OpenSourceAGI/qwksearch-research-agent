'use client';

/**
 * @fileoverview The QwkSearch app shell's provider stack — everything the
 * general app mounts around a page, independent of whether the REASON editor
 * is part of the build.
 */
import { useEffect, useState, type ComponentType, type ReactNode } from 'react';
import { ThemeProvider } from 'shadcn-theme-menu';
import { CategoryDockProvider } from 'shadcn-app-dock';
import { Toaster } from 'sonner';
import grab from 'grab-url';

import {
  configureResearchAgentUI,
  type ResearchAgentAuthClient,
  type ResearchAgentUIConfig,
} from '../config';
import { SessionProvider } from '../hooks/useSession';
import { ChatProvider } from '../hooks/useChat';
import { ExtractPanelProvider } from '../components/ArticleReader/ExtractPanelContext';
import { CategoryDock } from './CategoryDock';
import { CookieConsent } from './CookieConsent';
import { SpotlightPalette } from '../components/SpotlightPalette';
import { MainViewProvider } from './MainViewProvider';
import { useChunkErrorReload } from './useChunkErrorReload';

/** Identity wrapper used when the host supplies no extra provider. */
const PassThrough = ({ children }: { children: ReactNode }) => <>{children}</>;

export interface QwkSearchProvidersProps {
  children: ReactNode;
  /**
   * The host app's configured auth client (e.g. a better-auth React client).
   * See `ResearchAgentAuthClient` for the subset actually used.
   */
  authClient: ResearchAgentAuthClient;
  /**
   * Package configuration applied before the tree renders — the same values
   * `configureResearchAgentUI` takes. Supplying it here keeps branding, footer
   * links and callbacks with the mount instead of in a separate module
   * side effect.
   */
  config?: Partial<ResearchAgentUIConfig>;
  /**
   * Whether to prompt Google One Tap. `'auto'` (the default) asks the backend
   * which providers are configured and enables the prompt only when Google is
   * among them — prompting without a provider behind it can only fail.
   */
  googleOneTap?: boolean | 'auto';
  /**
   * Whether the REASON document surface is part of this build. Set by the
   * entry point rather than the host: `research-agent-ui` mounts chat only,
   * `research-agent-ui/workspace` mounts chat plus the editor and its sidebar.
   */
  docsEnabled?: boolean;
  /**
   * An extra provider mounted just inside the dock/view providers, for
   * app-owned context the shell's chrome reads — the settings modal, for
   * instance. Receives the rest of the tree as `children`.
   */
  ChromeProvider?: ComponentType<{ children: ReactNode }>;
  /** Render the app dock. Default true. */
  showDock?: boolean;
  /** Render the cookie-consent banner. Default true. */
  showCookieConsent?: boolean;
  /** Render the `sonner` toaster. Default true. */
  showToaster?: boolean;
  /**
   * Mount the Ctrl-Space spotlight palette. Default true. Turn it off in a
   * shell that already binds that chord (a VS Code webview, say, where the
   * host may want the keystroke for itself).
   */
  showSpotlight?: boolean;
}

/**
 * Asks the backend whether the Google auth provider is configured. Any failure
 * answers "no": a One Tap prompt with nothing to complete against is worse
 * than no prompt.
 */
function useGoogleOneTapAvailable(mode: boolean | 'auto'): boolean {
  const [available, setAvailable] = useState(mode === true);

  useEffect(() => {
    if (mode !== 'auto') {
      setAvailable(mode);
      return;
    }
    let cancelled = false;
    grab<{ providers?: string[] }>('auth/providers')
      .then((data) => {
        if (!cancelled) setAvailable(!!data.providers?.includes('google'));
      })
      .catch(() => {
        if (!cancelled) setAvailable(false);
      });
    return () => {
      cancelled = true;
    };
  }, [mode]);

  return available;
}

export function QwkSearchProviders({
  children,
  authClient,
  config,
  googleOneTap = 'auto',
  docsEnabled = true,
  ChromeProvider = PassThrough,
  showDock = true,
  showCookieConsent = true,
  showToaster = true,
  showSpotlight = true,
}: QwkSearchProvidersProps) {
  // Applied during render rather than from an effect so the very first paint
  // already reflects the host's branding — everything below this point reads
  // the config object synchronously. Re-applying is a cheap, idempotent
  // `Object.assign`, so repeated renders cost nothing.
  if (config) configureResearchAgentUI(config);

  const googleOneTapEnabled = useGoogleOneTapAvailable(googleOneTap);

  useChunkErrorReload();

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
              <ChromeProvider>
                <MainViewProvider docsEnabled={docsEnabled}>
                  {/* The app's single scroll container. `overflow-x` is clipped
                      rather than auto because full-bleed `w-screen` children
                      (the workspace shell) measure 100vw, which overhangs this
                      box by the scrollbar's width as soon as a page — the
                      homepage, now that /features stacks below it — actually
                      scrolls. Identified so scroll-driven UI can listen here
                      instead of on `window`, which never scrolls. */}
                  <div
                    id="app-scroll-root"
                    className="w-screen h-screen overflow-y-auto overflow-x-hidden pb-[calc(60px+env(safe-area-inset-bottom,0px))] md:pb-0"
                  >
                    {showDock && <CategoryDock />}
                    <main className="bg-light-primary dark:bg-dark-primary min-h-screen">
                      {children}
                    </main>
                  </div>
                </MainViewProvider>
              </ChromeProvider>
            </CategoryDockProvider>
            {showToaster && (
              <Toaster
                toastOptions={{
                  unstyled: true,
                  classNames: {
                    toast:
                      'bg-light-secondary dark:bg-dark-secondary dark:text-white/70 text-black-70 rounded-lg p-4 flex flex-row items-center space-x-2',
                  },
                }}
              />
            )}
            {showCookieConsent && <CookieConsent />}
            {/* Outside the scroll root and after the dock: it is an overlay
                over the whole app, and it reads the chat, session and view
                contexts it sits inside. */}
            {showSpotlight && <SpotlightPalette />}
          </ChatProvider>
        </ExtractPanelProvider>
      </SessionProvider>
    </ThemeProvider>
  );
}
