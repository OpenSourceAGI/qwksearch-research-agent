/**
 * Fail the build when the Worker bundle outgrows Cloudflare's size limit.
 *
 * Cloudflare measures a Worker's *compressed* size, and rejects an upload over
 * 10 MB. Finding that out from `wrangler deploy` means a full SPA + Worker
 * build has already been spent, and the error names no cause. This checks the
 * same number locally, right after the bundle is produced.
 *
 *   bun run cf:budget                       # check dist/worker/index.js
 *   WORKER_BUDGET_MB=9 bun run cf:budget    # tighten the ceiling
 *
 * The margin is thin: the QwkSearch article extractor (tier 0 of the extraction
 * chain) brought `linkedom` and Prism with it, taking the bundle from 7.39 MB
 * to 7.93 MB. A dependency that quietly eats another megabyte should be visible
 * before it is the one that breaks a deploy.
 *
 * Thresholds live in `workerBudget.ts`, which the test imports directly.
 */
import { readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { gzipSync } from 'node:zlib';

import { CLOUDFLARE_LIMIT_MB, DEFAULT_WARN_MB, MB, verdictFor } from './workerBudget';

const root = path.resolve(import.meta.dirname, '..');

const format = (bytes: number) => `${(bytes / MB).toFixed(2)} MB`;

const bundle = path.resolve(root, process.env.WORKER_BUNDLE || 'dist/worker/index.js');
const limitMb = Number(process.env.WORKER_BUDGET_MB || CLOUDFLARE_LIMIT_MB);
const warnMb = Number(process.env.WORKER_BUDGET_WARN_MB || DEFAULT_WARN_MB);

let raw: Buffer;
try {
  raw = readFileSync(bundle);
} catch {
  console.error(
    `✗ No Worker bundle at ${path.relative(root, bundle)}.\n` +
      `  Run \`bun run build:worker:server\` first.`,
  );
  process.exit(1);
}

// gzip level 9 matches the measurements recorded in README.md, so the numbers
// there stay comparable run to run.
const gzipBytes = gzipSync(raw, { level: 9 }).byteLength;
const { level } = verdictFor(gzipBytes, statSync(bundle).size, limitMb, warnMb);
const summary = `${format(gzipBytes)} gzipped (${format(raw.byteLength)} raw), limit ${limitMb} MB`;

if (level === 'fail') {
  console.error(`✗ Worker bundle over budget: ${summary}`);
  console.error('  Cloudflare will reject this upload. Drop a dependency or shim it out');
  console.error('  in `vite.worker.config.ts` before deploying.');
  process.exit(1);
} else if (level === 'warn') {
  console.warn(`⚠ Worker bundle is close to the limit: ${summary}`);
  console.warn(`  ${format(limitMb * MB - gzipBytes)} of headroom left.`);
} else {
  console.log(`✓ Worker bundle within budget: ${summary}`);
}
