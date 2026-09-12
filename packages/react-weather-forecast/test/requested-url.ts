/**
 * Rebuild the URL a `grab-url` call actually puts on the wire.
 *
 * The package hands grab-url a bare path plus the request's parameters as
 * grab-url options, because grab-url composes the query string itself from
 * every option it does not recognise (see `splitUrl` in `src/api/http.ts`).
 * So an assertion about "the URL that was requested" has to compose the two
 * halves the same way grab-url does rather than read the first argument.
 */
type GrabCall = [string, Record<string, unknown>?];

/** Options grab-url consumes rather than turning into query parameters. */
const CONSUMED = new Set(['headers', 'timeout', 'cancelOngoingIfNew', 'dom', 'unzip']);

export function requestedUrl(call: GrabCall | undefined): string {
  if (!call) throw new Error('no grab-url call to read a URL from');

  const [path, options = {}] = call;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(options)) {
    if (!CONSUMED.has(key)) params.set(key, String(value));
  }

  const query = params.toString();
  return query ? `${path}?${query}` : path;
}

/** The parameters a call sent, without the options grab-url consumes. */
export function requestedParams(call: GrabCall | undefined): Record<string, string> {
  const url = requestedUrl(call);
  const separator = url.indexOf('?');
  if (separator === -1) return {};
  return Object.fromEntries(new URLSearchParams(url.slice(separator + 1)));
}
