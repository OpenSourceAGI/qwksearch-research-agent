/**
 * Minimal `next/server` replacement for the Cloudflare Worker bundle.
 *
 * LobeHub's route handlers only touch a small surface of Next's request and
 * response helpers: `NextRequest#nextUrl`, `NextRequest#cookies`,
 * `NextResponse.json/redirect/next/rewrite` and `after()`. Everything here is
 * implemented on top of the Fetch API so the same handlers run unchanged on
 * Workers.
 */
import { parse as parseCookie } from 'cookie';

import { waitUntil } from '../cf/requestContext';

class RequestCookies {
  private readonly cookies: Record<string, string | undefined>;

  constructor(headers: Headers) {
    const header = headers.get('cookie');
    this.cookies = header ? parseCookie(header) : {};
  }

  get(name: string) {
    const value = this.cookies[name];
    return value === undefined ? undefined : { name, value };
  }

  getAll() {
    return Object.entries(this.cookies)
      .filter(([, value]) => value !== undefined)
      .map(([name, value]) => ({ name, value: value as string }));
  }

  has(name: string) {
    return this.cookies[name] !== undefined;
  }
}

export class NextRequest extends Request {
  readonly nextUrl: URL;
  readonly cookies: RequestCookies;

  constructor(input: RequestInfo | URL, init?: RequestInit) {
    super(input, init);
    this.nextUrl = new URL(this.url);
    this.cookies = new RequestCookies(this.headers);
  }

  static from(request: Request): NextRequest {
    if (request instanceof NextRequest) return request;
    return new NextRequest(request);
  }
}

interface CookieSetOptions {
  domain?: string;
  expires?: Date;
  httpOnly?: boolean;
  maxAge?: number;
  path?: string;
  sameSite?: 'lax' | 'strict' | 'none' | boolean;
  secure?: boolean;
}

class ResponseCookies {
  constructor(private readonly headers: Headers) {}

  set(name: string, value: string, options: CookieSetOptions = {}) {
    const parts = [`${name}=${encodeURIComponent(value)}`];
    if (options.maxAge !== undefined) parts.push(`Max-Age=${options.maxAge}`);
    if (options.expires) parts.push(`Expires=${options.expires.toUTCString()}`);
    if (options.domain) parts.push(`Domain=${options.domain}`);
    parts.push(`Path=${options.path ?? '/'}`);
    if (options.httpOnly) parts.push('HttpOnly');
    if (options.secure) parts.push('Secure');
    if (options.sameSite) {
      const sameSite = options.sameSite === true ? 'Strict' : options.sameSite;
      parts.push(`SameSite=${sameSite.charAt(0).toUpperCase()}${sameSite.slice(1)}`);
    }
    this.headers.append('set-cookie', parts.join('; '));
    return this;
  }

  delete(name: string) {
    return this.set(name, '', { maxAge: 0 });
  }
}

export class NextResponse extends Response {
  readonly cookies: ResponseCookies;

  constructor(body?: BodyInit | null, init?: ResponseInit) {
    super(body, init);
    this.cookies = new ResponseCookies(this.headers);
  }

  static json<JsonBody>(data: JsonBody, init: ResponseInit = {}): NextResponse {
    const headers = new Headers(init.headers);
    if (!headers.has('content-type')) headers.set('content-type', 'application/json');
    return new NextResponse(JSON.stringify(data), { ...init, headers });
  }

  static redirect(url: string | URL, init?: number | ResponseInit): NextResponse {
    const status = typeof init === 'number' ? init : (init?.status ?? 307);
    const headers = new Headers(typeof init === 'object' ? init?.headers : undefined);
    headers.set('location', url.toString());
    return new NextResponse(null, { headers, status });
  }

  /** In the Worker there is no middleware chain: `next()` is an empty 200. */
  static next(init?: ResponseInit): NextResponse {
    return new NextResponse(null, init);
  }

  /** Rewrites are expressed as an internal header the Worker router can honour. */
  static rewrite(destination: string | URL, init?: ResponseInit): NextResponse {
    const headers = new Headers(init?.headers);
    headers.set('x-middleware-rewrite', destination.toString());
    return new NextResponse(null, { ...init, headers });
  }
}

/** `after()` runs a task once the response has been handed to the client. */
export const after = (task: Promise<unknown> | (() => Promise<unknown> | void)) => {
  waitUntil(task);
};

export const userAgent = (request: { headers: Headers }) => ({
  ua: request.headers.get('user-agent') || '',
});

export { NextRequest as ImageResponse };
