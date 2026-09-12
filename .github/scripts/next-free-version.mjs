#!/usr/bin/env node
/**
 * Pick the next version npm will actually accept for a package.
 *
 * The publish workflow used to bump one patch above whichever was higher, the
 * local version or the registry's `latest` dist-tag, and assume the result was
 * free. It is not: the registry refuses a PUT for any version it has *ever*
 * seen, and plenty of those are invisible to `latest`.
 *
 *   npm error code E409
 *   npm error 409 Conflict - PUT https://registry.npmjs.org/extract-pdf
 *     - Cannot publish over previously staged version "0.1.275".
 *
 * A version reaches that state when a publish is interrupted part-way, when it
 * was published and later unpublished, or when it only ever carried a dist-tag
 * other than `latest`. Six packages hit this in one run (extract-pdf,
 * qwksearch-api-client, react-reason-editor-sidebar, search-web-api,
 * shadcn-app-dock, use-voice-control), each having "bumped" straight onto a
 * number the registry had already reserved.
 *
 * So treat the registry as the source of truth for which numbers are spent.
 * `versions` lists what is currently published; `time` additionally keeps an
 * entry for every version that ever existed, including staged and unpublished
 * ones — the exact numbers `latest` cannot see. The union of the two is the
 * taken set.
 *
 * Usage: node .github/scripts/next-free-version.mjs <package-name> <local-version>
 *   Prints the next free version, always strictly above <local-version>. If
 *   the registry says nothing about the package (a first publish, or an
 *   unreachable registry) that is just <local-version> plus a patch.
 */
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

/** A plain `major.minor.patch` release — what every package here publishes. */
const RELEASE = /^(\d+)\.(\d+)\.(\d+)$/;

/**
 * Compare two `major.minor.patch` versions numerically.
 *
 * @param {string} a
 * @param {string} b
 * @returns {number} negative if a < b, 0 if equal, positive if a > b
 */
export function compareVersions(a, b) {
  const left = a.split('.').map(Number);
  const right = b.split('.').map(Number);

  for (let i = 0; i < 3; i++) {
    const diff = (left[i] || 0) - (right[i] || 0);
    if (diff !== 0) return diff;
  }

  return 0;
}

/**
 * @param {string} version
 * @returns {string} the same version with its patch incremented
 */
export function bumpPatch(version) {
  const parts = version.split('.').map(Number);
  parts[2] = (parts[2] || 0) + 1;
  return parts.slice(0, 3).join('.');
}

/**
 * Every version number the registry has ever handed out for a package.
 *
 * `time` is the important half: npm keeps a timestamp for versions that are no
 * longer listed in `versions` (unpublished, or staged by a publish that never
 * finished), and those are exactly the ones that answer a fresh PUT with E409.
 *
 * @param {{ versions?: string[] | string, time?: Record<string, string> }} packument
 * @returns {Set<string>}
 */
export function takenVersions(packument) {
  const taken = new Set();
  if (!packument) return taken;

  // `npm view <name> versions --json` collapses a single-version package to a
  // bare string rather than a one-element array.
  const versions = packument.versions;
  for (const version of Array.isArray(versions)
    ? versions
    : versions
      ? [versions]
      : []) {
    if (RELEASE.test(version)) taken.add(version);
  }

  // `time` also carries `created`, `modified` and (for a wholly unpublished
  // package) `unpublished`; only the version-shaped keys matter here.
  for (const key of Object.keys(packument.time || {})) {
    if (RELEASE.test(key)) taken.add(key);
  }

  return taken;
}

/**
 * The lowest free version that is strictly above both `local` and everything
 * the registry has ever spent.
 *
 * Always a bump, never `local` itself: both callers already know `local`
 * cannot be published — the workflow reaches here either because that version
 * is on npm with different content, or because a publish attempt just came
 * back E409 for a version the registry will not admit to knowing.
 *
 * @param {string} local version in the package's own package.json
 * @param {Set<string>} taken every version the registry has ever seen
 * @returns {string}
 */
export function nextFreeVersion(local, taken) {
  let highest = RELEASE.test(local) ? local : '0.0.0';
  for (const version of taken) {
    if (compareVersions(version, highest) > 0) highest = version;
  }

  let next = bumpPatch(highest);
  // A gap in the taken set can only be below `highest`, so this loop normally
  // runs zero times; it is here so a registry that reports versions out of
  // order still cannot produce a number that is already spent.
  while (taken.has(next)) next = bumpPatch(next);

  return next;
}

/**
 * Ask npm for a package's published versions and its full release timeline.
 *
 * A package that has never been published (E404) and an unreachable registry
 * look the same from here: both yield an empty packument, so the answer comes
 * from the local version alone.
 *
 * @param {string} name
 * @param {(cmd: string, args: string[]) => string} [run] injection point for tests
 * @returns {{ versions?: string[], time?: Record<string, string> }}
 */
export function fetchPackument(name, run = defaultRun) {
  let raw;
  try {
    raw = run('npm', ['view', name, 'versions', 'time', '--json']);
  } catch {
    return {};
  }

  if (!raw || !raw.trim()) return {};

  try {
    return JSON.parse(raw) || {};
  } catch {
    return {};
  }
}

function defaultRun(cmd, args) {
  return execFileSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  const [name, local] = process.argv.slice(2);

  if (!name || !local) {
    console.error('Usage: node .github/scripts/next-free-version.mjs <package-name> <local-version>');
    process.exit(2);
  }

  console.log(nextFreeVersion(local, takenVersions(fetchPackument(name))));
}
