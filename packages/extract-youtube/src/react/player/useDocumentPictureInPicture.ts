/**
 * @fileoverview Hook that pops a DOM node into a floating always-on-top
 * window via the Document Picture-in-Picture API. The node is physically
 * moved (not cloned). An iframe inside it still reloads on the move, as
 * browsers reload any iframe that changes documents.
 */

'use client';

import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';

interface DocumentPictureInPicture {
  window: Window | null;
  requestWindow: (options?: { width?: number; height?: number }) => Promise<Window>;
}

declare global {
  interface Window {
    documentPictureInPicture?: DocumentPictureInPicture;
  }
}

/** Copy the host page's stylesheets into the PiP window so the widget still renders. */
function copyStyles(pipWindow: Window): void {
  Array.from(document.styleSheets).forEach((styleSheet) => {
    try {
      const rules = Array.from(styleSheet.cssRules)
        .map((rule) => rule.cssText)
        .join('');
      const style = pipWindow.document.createElement('style');
      style.textContent = rules;
      pipWindow.document.head.appendChild(style);
    } catch {
      // Cross-origin stylesheets throw on cssRules access — link them instead.
      if (styleSheet.href) {
        const link = pipWindow.document.createElement('link');
        link.rel = 'stylesheet';
        link.href = styleSheet.href;
        pipWindow.document.head.appendChild(link);
      }
    }
  });
}

/**
 * Give the PiP document this page's URL, so iframes moved into it are
 * requested with a `Referer` again.
 *
 * The PiP window opens on `about:blank`, and a request made from an
 * `about:blank` document carries no referrer at all, whatever the iframe's
 * `referrerpolicy` says. YouTube answers an embed with no referrer with
 * error 153 ("Video player configuration error"); the `origin` and
 * `widget_referrer` embed parameters do not stand in for the header.
 * `document.open()` called from this page sets the PiP document's URL to this
 * page's (HTML's "document open steps"), which restores the referrer. It runs
 * before anything is added to the window, since it clears the document.
 */
export function adoptOpenerUrl(pipWindow: Window): void {
  try {
    const doc = pipWindow.document;
    doc.open();
    doc.write('<!doctype html><html><head></head><body></body></html>');
    doc.close();
  } catch {
    // Keep the blank document; the embed may then report error 153.
  }
}

export function useDocumentPictureInPicture(nodeRef: RefObject<HTMLElement | null>) {
  const [isSupported, setIsSupported] = useState(false);
  const [isActive, setIsActive] = useState(false);
  // The open PiP window, so callers can listen to what its iframes post.
  const [pipWindow, setPipWindow] = useState<Window | null>(null);
  // Comment node left behind in the original spot, so the moved node can be
  // put back exactly where it came from.
  const anchorRef = useRef<Comment | null>(null);

  useEffect(() => {
    setIsSupported(typeof window !== 'undefined' && 'documentPictureInPicture' in window);
  }, []);

  const restoreNode = useCallback(() => {
    const node = nodeRef.current;
    const anchor = anchorRef.current;
    if (node && anchor?.parentNode) {
      anchor.after(node);
      anchor.remove();
    }
    anchorRef.current = null;
    setIsActive(false);
    setPipWindow(null);
  }, [nodeRef]);

  const exit = useCallback(() => {
    const pipWindow = typeof window === 'undefined' ? null : window.documentPictureInPicture?.window;
    if (!pipWindow) return;
    restoreNode();
    pipWindow.close();
  }, [restoreNode]);

  const toggle = useCallback(async () => {
    const docPip = window.documentPictureInPicture;
    const node = nodeRef.current;
    if (!docPip || !node) return;

    if (docPip.window) {
      exit();
      return;
    }

    const anchor = document.createComment('floating-youtube-player-pip-anchor');
    node.after(anchor);
    anchorRef.current = anchor;

    const pipWindow = await docPip.requestWindow({ width: 480, height: 270 });
    adoptOpenerUrl(pipWindow);
    copyStyles(pipWindow);
    pipWindow.document.body.style.margin = '0';
    pipWindow.document.body.style.background = '#000';
    pipWindow.document.body.style.overflow = 'hidden';
    pipWindow.document.body.appendChild(node);
    setIsActive(true);
    setPipWindow(pipWindow);

    pipWindow.addEventListener('pagehide', restoreNode, { once: true });
  }, [nodeRef, exit, restoreNode]);

  // Put the node back if the player unmounts while still popped out.
  useEffect(() => () => exit(), [exit]);

  return { isSupported, isActive, pipWindow, toggle, exit };
}
