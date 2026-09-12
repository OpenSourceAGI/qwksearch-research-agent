#!/usr/bin/env tsx

/**
 * Type-check a *scope* of this workspace — the QwkSearch-owned code — instead
 * of all of it.
 *
 * The repo-wide `bun run type-check` covers these files too, but it reaches
 * ~13.8 GB RSS and gets OOM-killed on a 15 GB box, so in practice nothing ever
 * checked them. A whole unwired extraction chain in
 * `worker/qwksearch/extract.ts` called two identifiers that existed nowhere in
 * the repo, and returned two `via` values outside the union it declares, from
 * the day it was written until it was deleted. This is the narrow check that
 * catches that.
 *
 * Errors from *outside* the given prefixes are printed as a count and ignored.
 * They are not noise to fix here: the scope imports `@/server/*` and a good
 * deal of upstream LobeHub, which carry pre-existing errors of their own (504
 * of them across `apps/desktop`, `apps/server` and `packages/*` as of this
 * writing). Only the prefixes decide the exit code.
 *
 * Usage:
 *   tsx scripts/typeCheckScoped.mts <tsconfig> <prefix> [...prefix]
 *
 * Both scopes are wired up as scripts — `type-check:worker` for the Worker
 * alone, which is the fast path while iterating on `worker/`, and
 * `type-check:qwksearch` for every QwkSearch-owned file, which is what CI runs.
 */
import { spawnSync } from 'node:child_process';

/** `path/to/file.ts(12,34): error TS2304: …` */
const ERROR_LINE = /^(?<file>[^(]+)\(\d+,\d+\): error TS\d+/;

const [config, ...prefixes] = process.argv.slice(2);

if (!config || prefixes.length === 0) {
  console.error('Usage: tsx scripts/typeCheckScoped.mts <tsconfig> <prefix> [...prefix]');
  process.exit(1);
}

const result = spawnSync('tsgo', ['--noEmit', '-p', config], {
  encoding: 'utf8',
  // A tree whose dependencies are not installed reports tens of thousands of
  // errors from the upstream files the scope imports; the 1 MB default
  // overflows with ENOBUFS and loses the scope's own errors along with them.
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
  const normalized = file.replaceAll('\\', '/');
  if (prefixes.some((prefix) => normalized.startsWith(prefix))) ours.push(line);
  else elsewhere += 1;
}

const scope = prefixes.join(', ');

if (elsewhere > 0) {
  console.log(`${elsewhere} error(s) outside ${scope} ignored (see the note in this script).`);
}

if (ours.length === 0) {
  console.log(`${scope} type-checks clean.`);
  process.exit(0);
}

console.error(`\n${ours.length} type error(s) in ${scope}:\n`);
for (const line of ours) console.error(line);
process.exit(1);
