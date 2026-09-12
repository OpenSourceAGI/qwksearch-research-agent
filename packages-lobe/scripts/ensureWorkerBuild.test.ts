// @vitest-environment node
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

/**
 * The guard runs as `wrangler.jsonc`'s custom build command, so what matters is
 * its exit code and whether it spends a full Worker build. Both are only
 * observable from outside, so each case runs the real script in a throwaway
 * directory whose `build:worker` is a stub that leaves a marker behind.
 */
const script = path.resolve(import.meta.dirname, 'ensureWorkerBuild.mjs');

const ARTIFACTS = ['dist/worker/index.js', 'dist/client/_spa/index.html'];

let dirs: string[] = [];

afterEach(() => {
  for (const dir of dirs) rmSync(dir, { force: true, recursive: true });
  dirs = [];
});

const fixture = ({
  buildWorker,
  artifacts = [],
}: {
  artifacts?: string[];
  buildWorker: string;
}) => {
  const root = mkdtempSync(path.join(tmpdir(), 'ensure-worker-build-'));
  dirs.push(root);

  mkdirSync(path.join(root, 'scripts'), { recursive: true });
  cpSync(script, path.join(root, 'scripts/ensureWorkerBuild.mjs'));
  writeFileSync(
    path.join(root, 'package.json'),
    JSON.stringify({ name: 'fixture', scripts: { 'build:worker': buildWorker } }),
  );

  for (const artifact of artifacts) {
    mkdirSync(path.join(root, path.dirname(artifact)), { recursive: true });
    writeFileSync(path.join(root, artifact), '');
  }

  return root;
};

/** A `build:worker` that records that it ran, and writes what a real one writes. */
const stubBuild = [
  "node -e \"require('node:fs').writeFileSync('build-ran', '')\"",
  ...ARTIFACTS.map(
    (artifact) =>
      `node -e "const fs=require('node:fs');fs.mkdirSync('${path.posix.dirname(artifact)}',{recursive:true});fs.writeFileSync('${artifact}','')"`,
  ),
].join(' && ');

const run = (root: string, env: Record<string, string> = {}) => {
  const result = spawnSync(process.execPath, ['scripts/ensureWorkerBuild.mjs'], {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, ...env },
  });

  return {
    built: existsSync(path.join(root, 'build-ran')),
    output: `${result.stdout}${result.stderr}`,
    status: result.status,
  };
};

describe('ensureWorkerBuild', () => {
  it('builds the Worker when the deploy would have no entry point', () => {
    const { built, output, status } = run(fixture({ buildWorker: stubBuild }));

    expect(status).toBe(0);
    expect(built).toBe(true);
    // The missing build command is the real fix; the log has to name it.
    expect(output).toContain('build:worker');
  });

  it('costs nothing when the build step already produced both outputs', () => {
    const root = fixture({ artifacts: ARTIFACTS, buildWorker: stubBuild });

    const { built, status } = run(root);

    expect(status).toBe(0);
    expect(built).toBe(false);
  });

  it('rebuilds when only the asset directory is missing', () => {
    const root = fixture({ artifacts: ['dist/worker/index.js'], buildWorker: stubBuild });

    const { built, status } = run(root);

    expect(status).toBe(0);
    expect(built).toBe(true);
  });

  it('checks without building under WORKER_BUILD_FALLBACK=0', () => {
    const { built, status } = run(fixture({ buildWorker: stubBuild }), {
      WORKER_BUILD_FALLBACK: '0',
    });

    expect(status).toBe(1);
    expect(built).toBe(false);
  });

  it('fails the deploy when the build fails', () => {
    const { status } = run(fixture({ buildWorker: 'exit 3' }));

    expect(status).toBe(3);
  });

  it('fails the deploy when the build passes but writes nothing', () => {
    // A green build with no bundle would otherwise hand wrangler the same
    // missing entry point, one step later.
    const { status } = run(fixture({ buildWorker: 'exit 0' }));

    expect(status).toBe(1);
  });
});
