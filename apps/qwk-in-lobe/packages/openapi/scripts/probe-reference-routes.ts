/**
 * Probes the documentation routes on the real Hono app and writes the result as
 * JSON to the file named by the first argument, for `src/app.test.ts`.
 *
 * It runs as a subprocess under `bun` for the same reason `generate-openapi.ts`
 * does: importing `src/app` pulls in the database and auth module graph, which
 * resolves through the root tsconfig's `paths` rather than the handful of
 * aliases the package's vitest config mirrors.
 *
 * The result goes to a file rather than stdout because the spec response alone
 * runs to hundreds of kilobytes. A payload that size does not survive a pipe
 * intact — it is split at a buffer boundary and interleaved with the app's own
 * request logger, which shares stdout — so reading it back is a truncated,
 * intermittently unparseable line.
 */
import { writeFileSync } from 'node:fs';

// (NODE_ENV is typed read-only, hence Object.assign)
if (!process.env.NODE_ENV) Object.assign(process.env, { NODE_ENV: 'test' });
process.env.KEY_VAULTS_SECRET ??= 'reference-route-probe';
process.env.CLOUD_DATABASE_URL ??= 'postgresql://mock:mock@localhost:5432/mock';
process.env.QSTASH_TOKEN ??= 'mock-qstash-token';

const outPath = process.argv[2];
if (!outPath) throw new Error('usage: bun scripts/probe-reference-routes.ts <output.json>');

const { honoApp } = await import('../src/app');

const probe = async (path: string) => {
  const res = await honoApp.fetch(new Request(`https://example.test${path}`));
  return {
    body: await res.text(),
    location: res.headers.get('Location'),
    status: res.status,
    type: res.headers.get('Content-Type'),
  };
};

writeFileSync(
  outPath,
  JSON.stringify({
    docs: await probe('/api/v1/docs'),
    health: await probe('/api/v1/health'),
    reference: await probe('/api/v1'),
    spec: await probe('/api/v1/openapi.json'),
  }),
);
