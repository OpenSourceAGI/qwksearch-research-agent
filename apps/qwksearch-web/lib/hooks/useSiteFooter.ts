/**
 * @fileoverview The browser half of `lib/site-footer`: reads the embedder's
 * `?footer=` choice, remembers it for the tab's session, and reports whether
 * the marketing footer should render.
 */
'use client';

import { useEffect, useState } from 'react';

import {
  SITE_FOOTER_PARAM,
  SITE_FOOTER_STORAGE_KEY,
  parseSiteFooterValue,
  resolveSiteFooter,
} from '@/lib/site-footer';

/** Storage can throw outright in a sandboxed or storage-blocked iframe. */
function readStored(): string | null {
  try {
    return window.sessionStorage.getItem(SITE_FOOTER_STORAGE_KEY);
  } catch {
    return null;
  }
}

function remember(visible: boolean) {
  try {
    window.sessionStorage.setItem(SITE_FOOTER_STORAGE_KEY, visible ? '1' : '0');
  } catch {
    // Not remembered: the footer simply follows the URL on each load.
  }
}

/**
 * True unless the embedding site asked for the footer to be left out. Starts
 * true on the server and the first client render — the footer sits at the very
 * bottom of the page, so settling it after mount never shifts anything the
 * reader is looking at.
 */
export function useSiteFooterVisible(): boolean {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const search = window.location.search;
    const explicit = parseSiteFooterValue(
      new URLSearchParams(search).get(SITE_FOOTER_PARAM),
    );
    if (explicit !== undefined) remember(explicit);
    setVisible(resolveSiteFooter({ search, stored: readStored() }));
  }, []);

  return visible;
}
