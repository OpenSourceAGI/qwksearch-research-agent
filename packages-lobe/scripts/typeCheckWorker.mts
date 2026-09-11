#!/usr/bin/env tsx

/**
 * Type-check `worker/` — the Cloudflare Worker serving the QwkSearch routes.
 *
 * The repo-wide `bun run type-check` covers these files too, but it reaches
 * ~13.8 GB RSS and gets OOM-killed on a 15 GB box, so in practice nothing ever
 * checked them. A whole unwired extraction chain in
 * `worker/qwksearch/extract.ts` called two identifiers that existed nowhere in
 * the repo, and returned two `via` values outside the union it declares, from
 * the day it was written until it was deleted. This is the narrow check that
 * catches that.
 *
 * Errors from *outside* `worker/` are printed as a count and ignored. They are
 * not noise to fix here: `worker/` imports `@/server/*`, so the program pulls
 * in `apps/server`, which carries pre-existing errors of its own. Only
 * `worker/` decides the exit code.
 */
import { spawnSync } from 'node:child_process';

const CONFIG = 'tsconfig.worker.json';
/** `path/to/file.ts(12,34): error TS2304: …` */
const ERROR_LINE = /^(?<file>[^(]+)\(\d+,\d+\): error TS\d+/;

const result = spawnSync('tsgo', ['--noEmit', '-p', CONFIG], {
  encoding: 'utf8',
  // A tree whose dependencies are not installed reports tens of thousands of
  // errors from the `apps/server` files `worker/` imports; the 1 MB default
  // overflows with ENOBUFS and loses the `worker/` errors along with them.
  maxBuffer: 256 * 1024 * 1024,
  shell: process.platform === 'win32',
});

if (result.error) {
  console.error(`Could not run tsgo: ${result.error.message}`);
  process.exit(1);
}

const lines = `${result.stdout || ''}${result.stderr || ''}`.split('\n');

const ours: string[] = [];
let elsewhere = 0;

for (const line of lines) {
  const file = line.match(ERROR_LINE)?.groups?.file;
  if (!file) continue;
  if (file.replaceAll('\\', '/').startsWith('worker/')) ours.push(line);
  else elsewhere += 1;
}

if (elsewhere > 0) {
  console.log(`${elsewhere} error(s) outside worker/ ignored (see the note in this script).`);
}

if (ours.length === 0) {
  console.log('worker/ type-checks clean.');
  process.exit(0);
}

console.error(`\n${ours.length} type error(s) in worker/:\n`);
for (const line of ours) console.error(line);
process.exit(1);
