import { useEffect } from 'react';

import { openArticlePanel } from './store';

export const OPEN_ARTICLE_EVENT = 'qwksearch:open-article';

/** Selector for the chat message containers whose links open in the article panel. */
const MESSAGE_SCOPE_SELECTOR = '[data-message-id]';

const isModifiedClick = (event: MouseEvent) =>
  event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;

/**
 * Decide whether a clicked anchor should open in the article panel instead of
 * navigating. Exported for tests.
 */
export const shouldInterceptAnchor = (
  anchor: HTMLAnchorElement,
  currentOrigin: string,
): string | null => {
  const href = anchor.getAttribute('href');
  if (!href) return null;
  if (anchor.dataset.qwkNoIntercept !== undefined) return null;
  if (anchor.hasAttribute('download')) return null;
  if (!anchor.closest(MESSAGE_SCOPE_SELECTOR)) return null;

  let url: URL;
  try {
    url = new URL(href, currentOrigin);
  } catch {
    return null;
  }

  if (!/^https?:$/.test(url.protocol)) return null;
  // Same-origin links are app navigation, not articles.
  if (url.origin === currentOrigin) return null;

  return url.toString();
};

/**
 * Opens external links clicked inside chat messages (citations, search
 * results, agent answers) in the article extract panel, mirroring QwkSearch's
 * behaviour where sources open beside the conversation. Modified clicks and
 * middle clicks keep the browser default so users can still open a new tab.
 */
export const useArticleLinkInterceptor = () => {
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || isModifiedClick(event)) return;
      const target = event.target as HTMLElement | null;
      const anchor = target?.closest?.('a');
      if (!anchor) return;

      const url = shouldInterceptAnchor(anchor, window.location.origin);
      if (!url) return;

      event.preventDefault();
      event.stopPropagation();
      openArticlePanel(url, window.getSelection()?.toString() ?? '');
    };

    const onOpenEvent = (event: Event) => {
      const detail = (event as CustomEvent<{ searchText?: string; url?: string }>).detail;
      if (detail?.url) openArticlePanel(detail.url, detail.searchText);
    };

    document.addEventListener('click', onClick, true);
    window.addEventListener(OPEN_ARTICLE_EVENT, onOpenEvent);

    return () => {
      document.removeEventListener('click', onClick, true);
      window.removeEventListener(OPEN_ARTICLE_EVENT, onOpenEvent);
    };
  }, []);
};
