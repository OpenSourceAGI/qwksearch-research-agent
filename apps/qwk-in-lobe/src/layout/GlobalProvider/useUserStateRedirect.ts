'use client';

import { useCallback } from 'react';

import { isDesktop } from '@/const/version';
import { onboardingSelectors } from '@/store/user/selectors';
import { type UserInitializationState } from '@/types/user';
import { buildOnboardingRedirectUrl } from '@/utils/onboardingRedirect';

const DEFER_REDIRECT_PREFIXES = ['/invite'];

/**
 * Chat pages a guest reaches from the home input. The home send opens
 * `/agent/<id>/<topic>`, so reloading or bookmarking that conversation must
 * show it, not bounce the visitor to onboarding they never asked for.
 */
const CHAT_FIRST_SEGMENTS = new Set(['agent', 'group']);

const RESERVED_FIRST_SEGMENTS = new Set([
  'agent',
  'apps',
  'community',
  'desktop-onboarding',
  'devtools',
  'eval',
  'group',
  'image',
  'me',
  'memory',
  'next-auth',
  'onboarding',
  'page',
  'projects',
  'resource',
  'settings',
  'share',
  'signin',
  'signup',
  'subscription',
  'task',
  'tasks',
  'video',
]);

const FIRST_SEGMENT_REGEX = /^\/([^/?#]+)/;

const isPathUnder = (pathname: string, prefix: string): boolean =>
  pathname === prefix || pathname.startsWith(`${prefix}/`);

const parseFirstSegment = (pathname: string): string | null => {
  const match = pathname.match(FIRST_SEGMENT_REGEX);
  return match ? match[1] : null;
};

/**
 * Never redirect the homepage or a chat: there is no sign-in here, so the home
 * chat is the first thing every visitor sees and has to take a message right
 * away, and the conversation it opens has to survive a reload. A fresh
 * database (every user unonboarded) would otherwise bounce them to
 * `/onboarding` first.
 *
 * Defer the onboarding redirect when the path is a workspace-scoped route
 * (first segment is a workspace slug, i.e. not one of the reserved app
 * segments) or an explicitly deferred prefix like `/invite`. Reserved
 * first segments (e.g. `/agent`, `/settings`) fall through to the normal
 * onboarding check.
 */
export const shouldDeferOnboardingRedirect = (pathname: string): boolean => {
  if (pathname === '/') return true;
  if (DEFER_REDIRECT_PREFIXES.some((prefix) => isPathUnder(pathname, prefix))) return true;

  const first = parseFirstSegment(pathname);
  if (first && CHAT_FIRST_SEGMENTS.has(first)) return true;

  return !!first && !RESERVED_FIRST_SEGMENTS.has(first);
};

const redirectToOnboarding = (currentPath: string, search: string) => {
  if (!currentPath.startsWith('/onboarding')) {
    // Thread the page the user was on so onboarding finish points return there
    window.location.href = buildOnboardingRedirectUrl(currentPath + search);
  }
};

export const useDesktopUserStateRedirect = () => {
  // Desktop onboarding redirect is now handled by main process (BrowserManager)
  // No need to check localStorage here
  return useCallback(() => {}, []);
};

export const useWebUserStateRedirect = () =>
  useCallback((state: UserInitializationState) => {
    const { pathname, search } = window.location;

    if (!onboardingSelectors.needsOnboarding(state)) return;
    if (shouldDeferOnboardingRedirect(pathname)) return;

    redirectToOnboarding(pathname, search);
  }, []);

export const useUserStateRedirect = () => {
  const desktopRedirect = useDesktopUserStateRedirect();
  const webRedirect = useWebUserStateRedirect();

  return useCallback(
    (state: UserInitializationState) => {
      const redirect = isDesktop ? desktopRedirect : webRedirect;
      redirect(state);
    },
    [desktopRedirect, webRedirect],
  );
};
