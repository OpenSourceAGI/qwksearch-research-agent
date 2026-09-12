/**
 * Guarantee the Worker build outputs exist before `wrangler deploy` uploads them.
 *
 * `wrangler.jsonc` runs this as its custom build command, so a deploy is
 * self-sufficient no matter what ran before it. Two ways it earns its place:
 *
 *  - Cloudflare Workers Builds defaults its build command to `npm run build`,
 *    which is the *Next* build here. It writes `.next/` and never
 *    `dist/worker/index.js`, so the deploy that follows fails with
 *    `The entry-point file at "dist/worker/index.js" was not found` after
 *    spending several minutes on a build whose output nothing uploads.
 *  - A local `wrangler deploy` typed without `bun run build:worker` first would
 *    otherwise upload a stale bundle, or none at all.
 *
 * When the outputs are already there (the `cf:deploy` path, which builds first)
 * this is a no-op costing one `stat` per file. When they are missing it runs
 * the real Worker build and says why, loudly — a misconfigured project setting
 * should be visible in the log, not silently papered over.
 *
 * Plain `.mjs` on purpose: this is the first thing that runs in a deploy, so it
 * assumes nothing beyond node — no `tsx`, no loaders, no install having been
 * hydrated the way the rest of `scripts/` expects.
 *
 *   node scripts/ensureWorkerBuild.mjs    # check, build only if needed
 *   WORKER_BUILD_FALLBACK=0 …             # check only, never build
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');

/** Everything `wrangler deploy` reads: the Worker entry and the ASSETS directory. */
const ARTIFACTS = ['dist/worker/index.js', 'dist/client/_spa/index.html'];

const missing = () => ARTIFACTS.filter((file) => !existsSync(path.resolve(root, file)));

const hasPackageManager = (bin) =>
  spawnSync(bin, ['--version'], { shell: process.platform === 'win32', stdio: 'ignore' }).status ===
  0;

const outstanding = missing();

if (outstanding.length === 0) {
  console.log(`✓ Worker build present (${ARTIFACTS.join(', ')})`);
  process.exit(0);
}

if (process.env.WORKER_BUILD_FALLBACK === '0') {
  console.error(`✗ Missing Worker build output: ${outstanding.join(', ')}`);
  process.exit(1);
}

// `pnpm` first: `pnpm-workspace.yaml` carries this tree's overrides and patches,
// and the README's Workers Builds recipe installs with it.
const pm = hasPackageManager('pnpm') ? 'pnpm' : 'npm';

console.warn(
  `! Missing Worker build output: ${outstanding.join(', ')}\n` +
    `  The build step that ran did not produce a Worker bundle — a Workers Builds\n` +
    `  project left on the default \`npm run build\` builds Next, not the Worker.\n` +
    `  Set the build command to \`pnpm run build:worker\` (README → Cloudflare\n` +
    `  Workers Builds). Running \`${pm} run build:worker\` now as a fallback.`,
);

const build = spawnSync(pm, ['run', 'build:worker'], {
  cwd: root,
  shell: process.platform === 'win32',
  stdio: 'inherit',
});

if (build.status !== 0) {
  console.error(`✗ \`${pm} run build:worker\` failed (exit ${build.status ?? 'signal'}).`);
  process.exit(build.status ?? 1);
}

const stillMissing = missing();
if (stillMissing.length > 0) {
  console.error(
    `✗ \`${pm} run build:worker\` finished but ${stillMissing.join(', ')} ` +
      `${stillMissing.length === 1 ? 'is' : 'are'} still missing.`,
  );
  process.exit(1);
}

console.log(`✓ Worker build produced ${ARTIFACTS.join(', ')}`);
