import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * Guards the two ways `bun install --frozen-lockfile` has broken the
 * Cloudflare deploy, both of which are visible in the committed files alone:
 *
 *  1. A dependency range moves in a package.json and bun.lock is not
 *     regenerated in the same commit. The next deploy dies with
 *     "error: lockfile had changes, but lockfile is frozen" before it
 *     compiles a line.
 *  2. A stale bun.lock sits at the root of a workspace package. bun resolves
 *     workspaces from the root lockfile, so nothing here ever refreshes the
 *     nested one, and any build that installs that package on its own (a
 *     per-directory CI root, a container that copies one package) hits the
 *     same frozen-lockfile error against a lockfile years out of date --
 *     `packages/search-web-api/bun.lock` still described a root package
 *     named "honox-searx" with dependency ranges five majors behind.
 *
 * The checks are pure file reads: no network, no bun binary, no install.
 */

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

const git = (...args) => execFileSync('git', args, { cwd: repoRoot, encoding: 'utf8' });

const readJson = (file) => JSON.parse(readFileSync(path.join(repoRoot, file), 'utf8'));

/** bun writes its lockfile as JSONC with trailing commas, which JSON.parse rejects. */
const readLockfile = (file) =>
  JSON.parse(readFileSync(path.join(repoRoot, file), 'utf8').replace(/,(\s*[}\]])/g, '$1'));

const rootPackageJson = readJson('package.json');
const rootLockfile = readLockfile('bun.lock');

/**
 * A workspace entry is one of two shapes.
 *
 * A glob ending in a single `*` segment (`packages/*`,
 * `packages/render-url-to-html/*`) expands to the tracked package.json files
 * exactly one level below it. A literal directory (`apps/qwksearch-web`) names
 * one workspace on its own: the apps are listed one by one rather than globbed
 * as `apps/*` so that a root install cannot walk into `apps/qwk-in-lobe`, which
 * is a pnpm workspace with its own rules.
 */
const workspaceDirs = [
  ...new Set(
    rootPackageJson.workspaces.flatMap((entry) => {
      if (!entry.endsWith('/*')) {
        const manifest = `${entry}/package.json`;
        if (!git('ls-files', '--', manifest).trim()) {
          throw new Error(`workspace ${entry} has no tracked ${manifest}`);
        }
        return [entry];
      }
      const prefix = entry.slice(0, -'/*'.length);
      const depth = prefix.split('/').length + 2;
      return git('ls-files', '--', `${prefix}/*/package.json`)
        .split('\n')
        .filter((file) => file && file.split('/').length === depth)
        .map((file) => path.dirname(file));
    }),
  ),
].sort();

const dependencyFields = ['dependencies', 'devDependencies', 'optionalDependencies'];

describe('root bun.lock', () => {
  it('lists exactly the workspace packages on disk', () => {
    const inLockfile = Object.keys(rootLockfile.workspaces)
      .filter((key) => key !== '')
      .sort();
    expect(inLockfile).toEqual(workspaceDirs);
  });

  it('records the root package.json dependency ranges verbatim', () => {
    for (const field of dependencyFields) {
      expect(rootLockfile.workspaces[''][field] ?? {}, `root ${field}`).toEqual(
        rootPackageJson[field] ?? {},
      );
    }
  });

  it.each(workspaceDirs)('records the %s dependency ranges verbatim', (dir) => {
    const manifest = readJson(`${dir}/package.json`);
    const locked = rootLockfile.workspaces[dir];
    expect(locked, `${dir} is missing from bun.lock`).toBeDefined();
    expect(locked.name).toBe(manifest.name);
    for (const field of dependencyFields) {
      expect(locked[field] ?? {}, `${dir} ${field}`).toEqual(manifest[field] ?? {});
    }
  });
});

describe('nested lockfiles', () => {
  it('are not committed at the root of a workspace package', () => {
    const shadowing = git('ls-files', '--', '*bun.lock')
      .split('\n')
      .filter(Boolean)
      .filter((file) => workspaceDirs.includes(path.dirname(file)));
    expect(
      shadowing,
      'a bun.lock at the root of a workspace package is never refreshed by an install from ' +
        'the repo root, so it goes stale and fails its own --frozen-lockfile check; delete it',
    ).toEqual([]);
  });
});
