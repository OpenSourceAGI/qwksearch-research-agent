import type { CreateClientConfig } from './src/client.gen';

/** The public deployment every client talks to unless told otherwise. */
export const DEFAULT_ORIGIN = 'https://opensourceagi.app';

const getBaseUrl = () => {
  if (typeof window !== 'undefined') {
    // Browser: an injected NEXT_PUBLIC_BASE_URL wins, then the page's own
    // origin, because the web app serves its API next to its pages. Pages that
    // are not served over http(s) — browser extensions, VS Code webviews, Tauri
    // windows, file:// — have no `/api` next to them, so they get the public
    // deployment instead.
    const injected = (window as any).NEXT_PUBLIC_BASE_URL;
    if (injected) return `${injected}/api`;
    const { protocol, host } = window.location ?? ({} as Location);
    if ((protocol === 'http:' || protocol === 'https:') && host) {
      return `${protocol}//${host}/api`;
    }
    return `${DEFAULT_ORIGIN}/api`;
  }
  // Server: use NEXT_PUBLIC_BASE_URL or fall back to the public deployment
  const env = typeof process !== 'undefined' ? process.env : undefined;
  return `${env?.NEXT_PUBLIC_BASE_URL || DEFAULT_ORIGIN}/api`;
};

export const baseUrl = getBaseUrl();

export const createClientConfig: CreateClientConfig = (config) => ({
  ...config,
  baseUrl,
});
