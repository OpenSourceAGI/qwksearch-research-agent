import grab from 'grab-url';

/**
 * Shared JSON transport for every upstream this package talks to (the geo
 * worker, the IP geolocation providers and the weather providers).
 *
 * `grab-url` is the HTTP client used across this repo rather than `fetch`: it
 * parses the JSON, applies a timeout and can repeat a failed request itself.
 * Unlike `fetch` it resolves rather than rejects when a request fails, handing
 * back the message on `.error`, so every call site has to inspect the payload
 * -- that check lives here so the callers can just `await` a typed body.
 *
 * On top of that this module adds what the upstreams actually need to stay up:
 * a classified retry loop (repeat what can recover, give up immediately on a
 * request the server called invalid) with exponential backoff, and it hands
 * grab-url a query string it cannot corrupt -- see {@link splitUrl}.
 */
export type GrabJsonOptions = {
  headers?: Record<string, string>;
  /** default=3 Total tries for this request, including the first one. */
  attempts?: number;
  /** default=400 Milliseconds before the second try; each further wait doubles. */
  retryDelay?: number;
  /** default=15 Seconds before a single try is aborted. */
  timeout?: number;
  /**
   * default=0 Extra tries inside each of our `attempts`, run back-to-back with
   * no backoff between them.
   *
   * This used to be forwarded to grab-url's own option of the same name. It no
   * longer is -- grab-url turns any option it does not recognise into a query
   * parameter, and `retryAttempts` is one it does not recognise, so forwarding
   * it appended `?retryAttempts=0` to every URL (see {@link splitUrl}). The
   * repeat is done here instead, which keeps the same try count without
   * touching the URL.
   */
  retryAttempts?: number;
  /**
   * default=false Repeat even when the server rejected the request as invalid
   * (a 4xx other than 408/429). Off by default: replaying a request that is
   * malformed only wastes the upstream's rate limit.
   */
  retryClientErrors?: boolean;
};

/**
 * Both kinds of upstream can answer HTTP 200 with an error flag instead of
 * data: ipapi.co does it for rate limits, Open-Meteo for a malformed query.
 */
type ErrorPayload = { error?: boolean | string; reason?: string };

/** Statuses worth repeating: the upstream is busy, cold or briefly broken. */
const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504, 520, 521, 522, 523, 524]);

/** A failed upstream call, carrying the HTTP status when the failure had one. */
export class HttpRequestError extends Error {
  readonly status?: number;
  readonly retryable: boolean;

  constructor(message: string, options: { status?: number; retryable?: boolean } = {}) {
    super(message);
    this.name = 'HttpRequestError';
    this.status = options.status;
    this.retryable = options.retryable ?? isRetryableStatus(options.status);
  }
}

/** No status at all means the request never reached the server -- worth a repeat. */
export function isRetryableStatus(status?: number): boolean {
  if (status === undefined) return true;
  return RETRYABLE_STATUS.has(status) || status >= 500;
}

/**
 * grab-url reports a failed request as `HTTP error: 429 Too Many Requests`.
 * That prefix is noise once the message is nested under `<label> failed:`,
 * so drop it and keep the status.
 */
function describeFailure(error: string): string {
  return error.replace(/^HTTP error:\s*/i, '').trim() || 'unknown error';
}

/** Read the HTTP status back out of the message grab-url built for it. */
function parseStatus(error: string): number | undefined {
  const match = /^\s*(?:HTTP error:\s*)?([1-5]\d{2})\b/.exec(error.replace(/^HTTP error:\s*/i, 'HTTP error: '));
  const status = match ? Number(match[1]) : Number.NaN;
  return Number.isFinite(status) ? status : undefined;
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * grab-url writes a parsed JSON object to the root of its response, but hands
 * back anything it could not parse as JSON under `.data`. Unwrap that shape so
 * providers only ever see the body itself.
 */
function unwrapBody<T>(payload: Record<string, unknown>): T {
  const keys = Object.keys(payload).filter((key) => key !== 'isLoading' && key !== 'error');
  if (keys.length === 1 && keys[0] === 'data') {
    const body = payload.data;
    if (body && typeof body === 'object') return body as T;
  }
  return payload as T;
}

/**
 * Split a full URL into the path grab-url should request and the query it
 * should build, because grab-url will not leave a query string we wrote alone.
 *
 * grab-url destructures the options it knows, then turns **every remaining
 * option** into the GET query string and concatenates it onto the path. So a
 * URL that already carries a `?` comes out with two of them, and the last real
 * value silently absorbs the leftover option:
 *
 * ```text
 * ...&daily=temperature_2m_max%2Cwind_speed_10m_max?retryAttempts=0
 * ```
 *
 * Open-Meteo reads that trailing segment as part of the last `daily` variable,
 * does not recognise it, and answers `400 Bad Request` -- which is exactly the
 * `Weather request failed: 400 Bad Request` the widget used to render, on every
 * weather provider (they all build a query), while the geolocation lookups kept
 * working because their URLs have no query of their own for the stray `?` to
 * collide with.
 *
 * Handing the query over as grab-url's own params instead means grab-url writes
 * the single `?` itself, so there is no query string of ours left to corrupt --
 * and an option it fails to recognise lands as one more harmless parameter
 * rather than inside the value of a real one.
 */
export function splitUrl(url: string): { path: string; params: Record<string, string> } {
  const separator = url.indexOf('?');
  if (separator === -1) return { path: url, params: {} };

  const params: Record<string, string> = {};
  // Last one wins, matching how every upstream here reads a repeated key.
  for (const [key, value] of new URLSearchParams(url.slice(separator + 1))) params[key] = value;

  return { path: url.slice(0, separator), params };
}

/**
 * Option names grab-url consumes itself. A query parameter sharing one of these
 * names cannot be passed as a param -- grab-url would read it as an option and
 * drop it from the URL -- and it cannot stay on the path either, since a query
 * string on the path is what {@link splitUrl} exists to avoid. None of this
 * package's upstreams use one; a new one would be a bug here, so it is
 * reported as a failed request (the provider chain then moves on) rather than
 * silently changing what goes on the wire.
 */
const GRAB_RESERVED_OPTIONS = new Set([
  'headers', 'response', 'method', 'cache', 'timeout', 'baseURL', 'cancelOngoingIfNew',
  'cancelNewIfOngoing', 'rateLimit', 'debug', 'infiniteScroll', 'logger', 'onRequest',
  'onResponse', 'onError', 'onStream', 'unzip', 'dom', 'body', 'post', 'put', 'patch',
  'debounce', 'repeat', 'repeatEvery', 'setDefaults', 'regrabOnStale', 'regrabOnFocus',
  'regrabOnNetwork', 'cacheForTime', 'retryAttempts',
]);

/** One try. Throws an {@link HttpRequestError} describing why it failed. */
async function grabJsonOnce<T>(url: string, label: string, options: GrabJsonOptions): Promise<T> {
  const { headers, timeout = 15 } = options;
  const { path, params } = splitUrl(url);

  const reserved = Object.keys(params).filter((key) => GRAB_RESERVED_OPTIONS.has(key));
  if (reserved.length > 0) {
    throw new HttpRequestError(
      `${label} failed: ${reserved.join(', ')} cannot be sent as a query parameter`,
      { retryable: false }
    );
  }

  const data = (await grab(path, {
    // grab-url builds the query from the options it does not recognise, so the
    // request's own parameters are passed as exactly that -- never as a query
    // string on `path`. Anything added here has to be an option grab-url knows,
    // or it goes out on the wire as a parameter.
    ...params,
    headers,
    timeout,
    // Several widgets (or several locations in one widget) hit the same path
    // at once, and grab-url aborts the earlier call of a duplicate path by
    // default -- which would surface as a spurious failure here.
    cancelOngoingIfNew: false,
    // These upstreams answer JSON; skip grab-url's HTML/ZIP post-processing so
    // an error page is never handed back as a parsed DOM.
    dom: false,
    unzip: false,
  })) as (T & ErrorPayload) | null | undefined;

  if (typeof data?.error === 'string') {
    const status = parseStatus(data.error);
    throw new HttpRequestError(`${label} failed: ${describeFailure(data.error)}`, { status });
  }

  if (data?.error === true) {
    // A 200 carrying an error flag is the upstream's own complaint (a rate
    // limit, or a query it could not parse) rather than a transport failure.
    const reason = data.reason ?? 'unknown error';
    throw new HttpRequestError(`${label} failed: ${reason}`, {
      retryable: /rate|limit|busy|timeout|try again/i.test(reason),
    });
  }

  if (!data) throw new HttpRequestError(`${label} failed: empty response`);

  return unwrapBody<T>(data as unknown as Record<string, unknown>);
}

/**
 * Request a JSON body, repeating what can recover and throwing a labelled
 * {@link HttpRequestError} once it cannot.
 *
 * @param url Full URL to request.
 * @param label Prefix for the thrown message, e.g. `ipapi.co lookup`.
 * @param options Transport and retry options.
 */
export async function grabJson<T>(
  url: string,
  label: string,
  options: GrabJsonOptions = {}
): Promise<T> {
  const attempts = Math.max(1, Math.trunc(options.attempts ?? 3));
  const retryDelay = Math.max(0, options.retryDelay ?? 400);
  // `retryAttempts` used to be handed to grab-url, which appended it to the
  // URL; the immediate repeats it asked for are run here instead.
  const immediate = Math.max(0, Math.trunc(options.retryAttempts ?? 0));

  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    let failure: unknown;

    for (let immediateTry = 0; immediateTry <= immediate; immediateTry++) {
      try {
        return await grabJsonOnce<T>(url, label, options);
      } catch (error) {
        failure = error;
      }
    }

    lastError = failure;

    const retryable =
      !(failure instanceof HttpRequestError) || failure.retryable || options.retryClientErrors === true;
    if (!retryable || attempt === attempts) break;

    // Exponential backoff: 1x, 2x, 4x ... of the configured delay.
    if (retryDelay > 0) await wait(retryDelay * 2 ** (attempt - 1));
  }

  throw lastError instanceof Error ? lastError : new HttpRequestError(String(lastError));
}
