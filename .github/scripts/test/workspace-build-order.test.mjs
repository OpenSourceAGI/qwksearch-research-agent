import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  localDependencyGraph,
  workspaceBuildOrder,
} from '../workspace-build-order.mjs';

const repoRoot = path.resolve(import.meta.dirname, '..', '..', '..');

/** Write a throwaway workspace and return its `packages` directory. */
function fixture(manifests) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'build-order-'));
  const packages = path.join(root, 'packages');
  fs.mkdirSync(packages);

  for (const [dir, pkg] of Object.entries(manifests)) {
    fs.mkdirSync(path.join(packages, dir));
    if (pkg === null) continue; // a directory with no package.json
    fs.writeFileSync(
      path.join(packages, dir, 'package.json'),
      JSON.stringify(pkg),
    );
  }

  return packages;
}

const tempRoots = [];
function tempWorkspace(manifests) {
  const packages = fixture(manifests);
  tempRoots.push(path.dirname(packages));
  return packages;
}

afterEach(() => {
  vi.restoreAllMocks();
  while (tempRoots.length > 0) {
    fs.rmSync(tempRoots.pop(), { force: true, recursive: true });
  }
});

describe('workspaceBuildOrder', () => {
  it('builds a package after every sibling it depends on', () => {
    const packages = tempWorkspace({
      // Alphabetically `app` sorts first, but it consumes both siblings.
      app: { name: 'app', dependencies: { dock: 'workspace:*', voice: '^1.0.0' } },
      dock: { name: 'dock', version: '0.1.0' },
      voice: { name: 'voice', version: '1.2.0' },
    });

    expect(workspaceBuildOrder(packages)).toEqual([
      `${packages}/dock/`,
      `${packages}/voice/`,
      `${packages}/app/`,
    ]);
  });

  it('orders alphabetically when nothing depends on anything', () => {
    const packages = tempWorkspace({
      b: { name: 'b' },
      a: { name: 'a' },
      c: { name: 'c' },
    });

    expect(workspaceBuildOrder(packages)).toEqual([
      `${packages}/a/`,
      `${packages}/b/`,
      `${packages}/c/`,
    ]);
  });

  it('skips directories without a readable package.json', () => {
    const packages = tempWorkspace({
      broken: { name: undefined },
      empty: null,
      real: { name: 'real' },
    });
    fs.writeFileSync(path.join(packages, 'broken', 'package.json'), '{ not json');
    vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(workspaceBuildOrder(packages)).toEqual([`${packages}/real/`]);
  });

  it('still emits every package when the graph has a cycle', () => {
    const packages = tempWorkspace({
      one: { name: 'one', dependencies: { two: 'workspace:*' } },
      two: { name: 'two', dependencies: { one: 'workspace:*' } },
    });
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(workspaceBuildOrder(packages)).toHaveLength(2);
    expect(errors).toHaveBeenCalledWith(expect.stringContaining('cycle'));
  });
});

describe('this workspace', () => {
  // The regression: publishing walked `packages/*​/` alphabetically, so
  // research-agent-ui was built before shadcn-app-dock, trending-news-api and
  // use-voice-control, and tsc could not resolve their type declarations.
  it('places every package after its local dependencies', () => {
    const order = workspaceBuildOrder(path.join(repoRoot, 'packages')).map(
      (dir) => path.basename(dir.replace(/\/$/, '')),
    );
    const graph = localDependencyGraph(
      order.map((dir) => ({
        dir,
        pkg: JSON.parse(
          fs.readFileSync(
            path.join(repoRoot, 'packages', dir, 'package.json'),
            'utf8',
          ),
        ),
      })),
    );

    for (const [index, dir] of order.entries()) {
      for (const dependency of graph.get(dir)) {
        expect(
          order.indexOf(dependency),
          `${dir} must be built after ${dependency}`,
        ).toBeLessThan(index);
      }
    }
  });

  it('builds research-agent-ui after the siblings whose types it imports', () => {
    const order = workspaceBuildOrder(path.join(repoRoot, 'packages'));
    const at = (dir) => order.indexOf(`${repoRoot}/packages/${dir}/`);

    for (const sibling of [
      'shadcn-app-dock',
      'trending-news-api',
      'use-voice-control',
    ]) {
      expect(at(sibling)).toBeGreaterThanOrEqual(0);
      expect(at(sibling)).toBeLessThan(at('research-agent-ui'));
    }
  });
});
