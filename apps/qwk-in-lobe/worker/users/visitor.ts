/**
 * Visitor identity for the Worker: one guest user per browser.
 *
 * The `lobe_uid` cookie holds a 128-bit random id. It is the bearer of that
 * user's data, like a session token: HttpOnly so page scripts cannot read it,
 * SameSite=Lax so other sites cannot send it with their own requests. An id is
 * only accepted in its minted shape, so a cookie can never name the shared
 * local user or any id that was not minted here.
 *
 * The cookie is minted on whichever request arrives without one, in practice
 * the HTML page view, so the dozen tRPC calls the SPA fires in parallel right
 * after all carry the same id instead of each creating a user.
 */

export const VISITOR_COOKIE = 'lobe_uid';

/** 400 days, the longest lifetime browsers honour for a cookie. */
export const VISITOR_COOKIE_MAX_AGE = 400 * 24 * 60 * 60;

const VISITOR_ID_PATTERN = /^guest_[\da-f]{32}$/;

export const isVisitorId = (value: unknown): value is string =>
  typeof value === 'string' && VISITOR_ID_PATTERN.test(value);

export const mintVisitorId = (): string => {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return `guest_${Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')}`;
};

/** The visitor id in a `Cookie` header, if it holds a well-formed one. */
export const readVisitorId = (cookieHeader: string | null | undefined): string | undefined => {
  if (!cookieHeader) return undefined;

  for (const part of cookieHeader.split(';')) {
    const separator = part.indexOf('=');
    if (separator === -1) continue;
    if (part.slice(0, separator).trim() !== VISITOR_COOKIE) continue;

    const value = part.slice(separator + 1).trim();
    if (isVisitorId(value)) return value;
  }

  return undefined;
};

export const buildVisitorCookie = (visitorId: string, secure: boolean): string =>
  [
    `${VISITOR_COOKIE}=${visitorId}`,
    'Path=/',
    `Max-Age=${VISITOR_COOKIE_MAX_AGE}`,
    'HttpOnly',
    'SameSite=Lax',
    ...(secure ? ['Secure'] : []),
  ].join('; ');

export interface ResolvedVisitor {
  /** A `Set-Cookie` value to send back when the id was minted for this request. */
  setCookie?: string;
  visitorId: string;
}

/** The request's visitor, minting a new guest id when it carries none. */
export const resolveVisitor = (request: Request): ResolvedVisitor => {
  const existing = readVisitorId(request.headers.get('cookie'));
  if (existing) return { visitorId: existing };

  const visitorId = mintVisitorId();
  const secure = new URL(request.url).protocol === 'https:';
  return { setCookie: buildVisitorCookie(visitorId, secure), visitorId };
};

/** Attach the visitor cookie to a response; responses from bindings have immutable headers. */
export const withVisitorCookie = (response: Response, setCookie: string | undefined): Response => {
  if (!setCookie) return response;

  // A WebSocket upgrade response cannot be re-wrapped; it carries no page anyway.
  if (response.status === 101) return response;

  const copy = new Response(response.body, response);
  copy.headers.append('set-cookie', setCookie);
  return copy;
};
