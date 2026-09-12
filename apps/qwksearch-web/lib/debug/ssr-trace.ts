/**
 * @fileoverview Breadcrumbs for the homepage's server-render 500.
 *
 * Why this file exists: a render failure on this stack is *silent*. vinext
 * hands React's `onError` to an error-meta renderer that only looks for
 * redirect/not-found digests and drops everything else, and when the app has no
 * `global-error.tsx` a shell error is swallowed into a built-in error document
 * with `status: 500`. Cloudflare then records the invocation as a bare
 * `GET https://…/ → 500` with no message, no route and no stack — exactly the
 * report that started this hunt.
 *
 * So the app logs for itself. Two kinds of line, deliberately distinct:
 *
 *   `[ssr-trace]`  breadcrumbs — module evaluated, render entered, render left.
 *                  Chatty, sequence-numbered, silenced by `QS_SSR_TRACE=off`.
 *   `[ssr-error]`  a failure, with the error unwrapped as far as it goes.
 *                  Never silenced: an error nobody logs is the bug we are here
 *                  for.
 *
 * The sequence number restarts per module graph, not per request: the RSC and
 * SSR environments are separate graphs with their own copy of this module, so
 * a single page render prints two `#1`s. Order lines by the `+Nms` stamp and by
 * where they sit in the log, never by the counter alone.
 *
 * Read a trace by its *last* line. Module-evaluation breadcrumbs are emitted in
 * import order, so the last `…:module` line before the 500 names the module
 * whose evaluation threw — the failure mode that took the homepage down in #440
 * and #451, where the throw happens as the route module loads and React never
 * gets a boundary to fall back on.
 *
 * Everything here is safe on a Worker, in Node and in a browser: no `process`
 * without a guard, no `window` without a guard, and no throw of its own — a
 * logger that can fail is one more way to lose the page.
 */

/** Marks a breadcrumb. Silenced by `QS_SSR_TRACE=off`. */
export const SSR_TRACE_PREFIX = "[ssr-trace]";

/** Marks a failure. Always printed. */
export const SSR_ERROR_PREFIX = "[ssr-error]";

/**
 * vinext replaces a server error with a redacted one before it reaches a
 * client boundary in production, and hangs the original off the replacement
 * under this symbol. Reading it back is the only way to see the real message
 * and stack from inside `global-error.tsx`.
 *
 * @see node_modules/vinext/dist/server/app-rsc-errors.js — `sanitizeErrorForClient`
 */
const VINEXT_ORIGINAL_SERVER_ERROR = Symbol.for("vinext.originalServerError");

/** How deep to follow `error.cause` before assuming the chain is a cycle. */
const MAX_CAUSE_DEPTH = 5;

/** Longest stack we print. A Worker log line is truncated well before this. */
const MAX_STACK_CHARS = 4000;

let sequence = 0;
const isolateStart = Date.now();

/** `process.env` is only present under `nodejs_compat`, and never in a browser. */
function readEnv(name: string): string | undefined {
  try {
    return (globalThis as { process?: { env?: Record<string, string | undefined> } }).process
      ?.env?.[name];
  } catch {
    return undefined;
  }
}

/** Which side of the render a line came from — both go to the same console. */
export function traceSide(): "server" | "browser" {
  return typeof window === "undefined" ? "server" : "browser";
}

/**
 * Breadcrumbs are on by default: they exist to catch a failure that has so far
 * only happened in production, and a trace that has to be turned on first is a
 * trace nobody has when it matters. `QS_SSR_TRACE=off` (a plain Worker
 * Variable, so it takes effect without a redeploy) turns them off again.
 */
export function isSsrTraceEnabled(): boolean {
  const flag = readEnv("QS_SSR_TRACE")?.trim().toLowerCase();
  return flag !== "off" && flag !== "0" && flag !== "false" && flag !== "no";
}

/** JSON that cannot throw, whatever it is handed. */
function safeJson(value: unknown): string {
  if (value === undefined) return "";
  try {
    const seen = new WeakSet<object>();
    return JSON.stringify(value, (_key, inner) => {
      if (typeof inner === "bigint") return `${inner}n`;
      if (typeof inner === "function") return `[function ${inner.name || "anonymous"}]`;
      if (typeof inner === "symbol") return inner.toString();
      if (inner && typeof inner === "object") {
        if (seen.has(inner as object)) return "[circular]";
        seen.add(inner as object);
      }
      return inner;
    }) ?? String(value);
  } catch {
    return `[unserializable ${typeof value}]`;
  }
}

/**
 * One breadcrumb.
 *
 * @param step - Dotted name of the point being passed, e.g. `layout:render:enter`.
 * @param details - Anything worth carrying; serialized defensively.
 */
export function traceSsr(step: string, details?: Record<string, unknown>): void {
  if (!isSsrTraceEnabled()) return;
  try {
    sequence += 1;
    const suffix = safeJson(details);
    console.log(
      `${SSR_TRACE_PREFIX} #${sequence} +${Date.now() - isolateStart}ms ${traceSide()} ${step}${
        suffix ? ` ${suffix}` : ""
      }`,
    );
  } catch {
    // A logger that throws would become the outage it is here to explain.
  }
}

/** The shape `describeError` returns — a plain object, safe to serialize. */
export interface DescribedError {
  name?: string;
  message?: string;
  digest?: string;
  stack?: string;
  /** Set when the value thrown was not an `Error` at all. */
  thrownValue?: string;
  /** Present when vinext's redaction was unwrapped to reach the real error. */
  unwrappedFromVinextDigest?: string;
  cause?: DescribedError;
}

/**
 * Flattens anything throwable into a loggable object: name, message, digest,
 * stack, and the `cause` chain behind it.
 *
 * Unwraps vinext's production redaction first — without that step every server
 * error in the log reads "The specific message is omitted in production
 * builds", which is the opposite of what a debug log is for.
 */
export function describeError(error: unknown, depth = 0): DescribedError {
  if (depth > MAX_CAUSE_DEPTH) return { message: "[cause chain too deep]" };

  if (error && typeof error === "object" && VINEXT_ORIGINAL_SERVER_ERROR in error) {
    const original = Reflect.get(error, VINEXT_ORIGINAL_SERVER_ERROR);
    const redactedDigest =
      "digest" in error && error.digest !== undefined ? String(error.digest) : undefined;
    return {
      ...describeError(original, depth + 1),
      ...(redactedDigest ? { unwrappedFromVinextDigest: redactedDigest } : {}),
    };
  }

  if (error instanceof Error) {
    const described: DescribedError = {
      name: error.name,
      message: error.message,
      stack: error.stack?.slice(0, MAX_STACK_CHARS),
    };
    const digest = (error as { digest?: unknown }).digest;
    if (digest !== undefined) described.digest = String(digest);
    if (error.cause !== undefined && error.cause !== null) {
      described.cause = describeError(error.cause, depth + 1);
    }
    return described;
  }

  if (error && typeof error === "object") {
    const digest = (error as { digest?: unknown }).digest;
    return {
      thrownValue: safeJson(error),
      ...(digest === undefined ? {} : { digest: String(digest) }),
    };
  }

  return { thrownValue: String(error) };
}

/**
 * One failure. Printed whether or not breadcrumbs are enabled — the whole point
 * is that this line exists when the next `500` shows up in the dashboard.
 */
export function logSsrError(
  step: string,
  error: unknown,
  details?: Record<string, unknown>,
): void {
  try {
    console.error(
      `${SSR_ERROR_PREFIX} ${traceSide()} ${step}`,
      safeJson({ ...details, error: describeError(error) }),
    );
  } catch {
    // See `traceSsr`.
  }
}

/**
 * Wraps a module's own evaluation in a breadcrumb pair. Call it as the *last*
 * statement of a module that is expensive or risky to evaluate; a missing
 * `…:module` line then means evaluation never finished.
 */
export function traceModuleEvaluated(moduleName: string): void {
  traceSsr(`module:${moduleName}`);
}
