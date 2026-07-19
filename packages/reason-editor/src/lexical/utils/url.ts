/**
 * @fileoverview Utilities for URL validation and sanitization.
 */
const SUPPORTED_URL_PROTOCOLS = new Set([
  "http:",
  "https:",
  "mailto:",
  "sms:",
  "tel:",
]);

/**
 * Sanitizes a URL by checking its protocol against a whitelist of supported protocols.
 * Returns 'about:blank' if the protocol is not supported.
 * @param {string} url - The URL to sanitize.
 * @returns {string} The sanitized or original URL.
 */
export function sanitizeUrl(url: string): string {
  try {
    const parsedUrl = new URL(url);
    // eslint-disable-next-line no-script-url
    if (!SUPPORTED_URL_PROTOCOLS.has(parsedUrl.protocol)) {
      return "about:blank";
    }
  } catch {
    return url;
  }
  return url;
}

// Source: https://stackoverflow.com/a/8234912/2013580
const urlRegExp = new RegExp(
  /((([A-Za-z]{3,9}:(?:\/\/)?)(?:[-;:&=+$,\w]+@)?[A-Za-z0-9.-]+|(?:www.|[-;:&=+$,\w]+@)[A-Za-z0-9.-]+)((?:\/[+~%/.\w-_]*)?\??(?:[-+=&;%@.\w_]*)#?(?:[\w]*))?)/,
);
/**
 * Validates whether a string is a correctly formatted URL.
 * Also accepts 'https://' as a special case for UI reasons (to be fixed).
 * @param {string} url - The URL string to validate.
 * @returns {boolean} True if the URL is valid.
 */
export function validateUrl(url: string): boolean {
  // TODO Fix UI for link insertion; it should never default to an invalid URL such as https://.
  // Maybe show a dialog where they user can type the URL before inserting it.
  return url === "https://" || urlRegExp.test(url);
}
