#!/usr/bin/env node
/**
 * Order the workspace's package directories so that every package comes after
 * each sibling it depends on.
 *
 * The npm publish workflow used to walk `packages/*​/`, i.e. shell-glob
 * (alphabetical) order, which has nothing to do with the dependency graph.
 * `bun install` links workspace packages into `node_modules` as symlinks, so a
 * sibling that has not been built yet has no `dist/` and the `exports` ->
 * `types` entries in its package.json point at files that do not exist. That
 * made `research-agent-ui` (13th alphabetically) fail its declaration build on
 * the three siblings that sort after it:
 *
 *   Cannot find module 'shadcn-app-dock' or its corresponding type declarations.
 *   Cannot find module 'trending-news-api' or its corresponding type declarations.
 *   Cannot find module 'use-voice-control/client' ...
 *
 * Usage: node .github/scripts/workspace-build-order.mjs [rootDir]
 *   rootDir defaults to `packages`. Prints one directory per line, with a
 *   trailing slash, e.g. `packages/domain-rank/`.
 */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

/**
 * Read every `<root>/<dir>/package.json` that exists.
 *
 * @param {string} root
 * @returns {{ dir: string, pkg: Record<string, any> }[]}
 */
export function readWorkspacePackages(root) {
  const packages = [];

  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;

    const manifest = path.join(root, entry.name, 'package.json');
    if (!fs.existsSync(manifest)) continue;

    let pkg;
    try {
      pkg = JSON.parse(fs.readFileSync(manifest, 'utf8'));
    } catch (error) {
      console.error(`Skipping ${manifest}: ${error.message}`);
      continue;
    }
    if (!pkg.name) continue;

    packages.push({ dir: entry.name, pkg });
  }

  return packages;
}

/**
 * Map each package directory to the sibling directories it depends on.
 *
 * Local edges are keyed by package *name*, not by the version range: bun links
 * a sibling into node_modules whenever the name matches a workspace package, so
 * `"use-voice-control": "^0.1.37"` resolves to the local copy exactly like
 * `"workspace:*"` does, and needs building just the same.
 *
 * @param {{ dir: string, pkg: Record<string, any> }[]} packages
 * @returns {Map<string, Set<string>>}
 */
export function localDependencyGraph(packages) {
  const dirByName = new Map(packages.map(({ dir, pkg }) => [pkg.name, dir]));
  const graph = new Map();

  for (const { dir, pkg } of packages) {
    const local = new Set();
    for (const field of [
      'dependencies',
      'devDependencies',
      'peerDependencies',
      'optionalDependencies',
    ]) {
      for (const name of Object.keys(pkg[field] ?? {})) {
        const depDir = dirByName.get(name);
        if (depDir && depDir !== dir) local.add(depDir);
      }
    }
    graph.set(dir, local);
  }

  return graph;
}

/**
 * Topologically sort the workspace, alphabetically within each ready set so the
 * order is stable across runs and stays close to the old one where the graph
 * allows it.
 *
 * @param {string} [root]
 * @returns {string[]} directories, e.g. `['packages/domain-rank/', ...]`
 */
export function workspaceBuildOrder(root = 'packages') {
  const packages = readWorkspacePackages(root);
  const dependencies = localDependencyGraph(packages);

  const pending = packages.map(({ dir }) => dir).sort();
  const built = new Set();
  const order = [];

  while (pending.length > 0) {
    const ready = pending.findIndex((dir) =>
      [...dependencies.get(dir)].every((dep) => built.has(dep)),
    );

    // A dependency cycle leaves nothing ready. No order can be right, so take
    // the alphabetically first entry and keep going: everything still gets
    // built and published, and the cycle is reported on stderr where it shows
    // up in the job log.
    if (ready === -1) {
      console.error(
        `Dependency cycle involving ${pending[0]} — falling back to alphabetical order for it`,
      );
    }

    const [dir] = pending.splice(ready === -1 ? 0 : ready, 1);
    built.add(dir);
    order.push(`${root}/${dir}/`);
  }

  return order;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  console.log(workspaceBuildOrder(process.argv[2]).join('\n'));
}
