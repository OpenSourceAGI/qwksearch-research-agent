/**
 * @fileoverview Decides whether the marketing close at the bottom of the
 * homepage and `/features` is shown: the "Enterprise & white-label" sign-up
 * box and the QwkSearch site footer under it.
 *
 * Any origin may frame this app (`frame-ancestors *` in `next.config.mjs`), and
 * a site embedding it usually does not want our sales form and footer links
 * inside its own page. It opts out on the iframe URL:
 *
 *   <iframe src="https://qwksearch.com/?footer=0"></iframe>
 *
 * The choice is remembered for the rest of the tab's session, because the
 * query string does not survive the app's own navigation — opening a chat and
 * coming back to `/` would otherwise bring the footer back.
 *
 * Kept free of React and the DOM so it can be unit tested without either.
 */

/** Query parameter an embedding site sets to show or hide the footer. */
export const SITE_FOOTER_PARAM = 'footer';

/** `sessionStorage` key the last explicit choice is remembered under. */
export const SITE_FOOTER_STORAGE_KEY = 'qwksearch:site-footer';

const HIDE_VALUES = new Set(['0', 'false', 'off', 'no', 'hide']);
const SHOW_VALUES = new Set(['1', 'true', 'on', 'yes', 'show']);

/**
 * Reads one `footer` value: `false` to hide, `true` to show, `undefined` when
 * the value is missing or unrecognised (which leaves the decision to whatever
 * was chosen before).
 */
export function parseSiteFooterValue(value: string | null | undefined): boolean | undefined {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) return undefined;
  if (HIDE_VALUES.has(normalized)) return false;
  if (SHOW_VALUES.has(normalized)) return true;
  return undefined;
}

/** Everything the footer decision needs, read from the URL and storage. */
export interface SiteFooterInputs {
  /** `location.search`, with or without the leading `?`. */
  search: string;
  /** The value remembered in `sessionStorage`, if any. */
  stored: string | null;
}

/**
 * Whether to render the footer. The URL wins over the remembered choice, so an
 * embedder can always flip it back with `?footer=1`; with neither, the footer
 * shows — qwksearch.com's own pages keep it.
 */
export function resolveSiteFooter({ search, stored }: SiteFooterInputs): boolean {
  const fromUrl = parseSiteFooterValue(new URLSearchParams(search).get(SITE_FOOTER_PARAM));
  return fromUrl ?? parseSiteFooterValue(stored) ?? true;
}
