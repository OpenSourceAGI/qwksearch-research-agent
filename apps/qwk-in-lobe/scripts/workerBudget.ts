/**
 * Thresholds for the Worker bundle size check.
 *
 * Split out of `checkWorkerBudget.mts` so the decision can be tested without
 * running the CLI or building a bundle — and so the test does not have to
 * import a `.mts` file, which needs `allowImportingTsExtensions`.
 */

/** Cloudflare's hard ceiling on a compressed Worker upload. */
export const CLOUDFLARE_LIMIT_MB = 10;

/**
 * Report a bundle with under ~1 MB of headroom, without failing.
 *
 * Deliberately above today's 7.9 MB: a warning that fires on every build is one
 * nobody reads. This is the "one more dependency and the deploy breaks" line.
 */
export const DEFAULT_WARN_MB = 9;

export const MB = 1024 * 1024;

export interface BudgetVerdict {
  gzipBytes: number;
  level: 'fail' | 'ok' | 'warn';
  rawBytes: number;
}

export const verdictFor = (
  gzipBytes: number,
  rawBytes: number,
  limitMb: number = CLOUDFLARE_LIMIT_MB,
  warnMb: number = DEFAULT_WARN_MB,
): BudgetVerdict => ({
  gzipBytes,
  level: gzipBytes > limitMb * MB ? 'fail' : gzipBytes > warnMb * MB ? 'warn' : 'ok',
  rawBytes,
});
