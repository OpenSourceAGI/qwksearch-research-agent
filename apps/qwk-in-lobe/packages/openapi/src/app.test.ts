/**
 * The Scalar API reference moved from `/api/v1/docs` up to `/api/v1`. Both
 * halves of that move are load-bearing and neither fails loudly: a viewer
 * served from the wrong path is a 404 people meet before they meet the API,
 * and a dropped redirect quietly breaks the `/api/v1/docs` link in the
 * `@lobehub/sdk` README already published to npm, which cannot be edited.
 *
 * The probe runs as a subprocess under `bun` — the same shape as
 * `scripts/generate-openapi.test.ts` — because importing the app reaches the
 * database and auth module graph, which resolves through the root tsconfig's
 * `paths` rather than the aliases this package's vitest config mirrors. It
 * hands its result back through a file; see the script for why not stdout.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const PKG_ROOT = path.join(__dirname, '..');

interface Probe {
  body: string;
  location: string | null;
  status: number;
  type: string | null;
}

let routes: Record<'docs' | 'health' | 'reference' | 'spec', Probe>;
let workDir: string;

beforeAll(() => {
  // Via a file, not stdout: the spec response alone runs to hundreds of
  // kilobytes, which a pipe splits at a buffer boundary and interleaves with
  // the app's own request logger.
  workDir = mkdtempSync(path.join(tmpdir(), 'openapi-probe-'));
  const outPath = path.join(workDir, 'routes.json');

  execFileSync('bun', ['scripts/probe-reference-routes.ts', outPath], {
    cwd: PKG_ROOT,
    encoding: 'utf8',
    stdio: 'pipe',
  });

  routes = JSON.parse(readFileSync(outPath, 'utf8'));
}, 120_000);

afterAll(() => {
  if (workDir) rmSync(workDir, { force: true, recursive: true });
});

describe('GET /api/v1', () => {
  it('serves the Scalar viewer pointed at the spec this app publishes', () => {
    expect(routes.reference.status).toBe(200);
    expect(routes.reference.type).toContain('text/html');
    expect(routes.reference.body).toContain('/api/v1/openapi.json');
  });

  it('points at a spec route the app actually serves', () => {
    expect(routes.spec.status).toBe(200);
    expect(JSON.parse(routes.spec.body).openapi).toBeTruthy();
  });
});

describe('GET /api/v1/docs', () => {
  it('permanently redirects to the reference at its new home', () => {
    expect(routes.docs.status).toBe(308);
    expect(routes.docs.location).toBe('/api/v1');
  });
});

describe('the reference at the root', () => {
  it('does not shadow the routes mounted under it', () => {
    expect(routes.health.status).toBe(200);
    expect(JSON.parse(routes.health.body).status).toBe('ok');
  });
});
