/**
 * Generate the OpenAPI 3.1 spec (openapi.yml) from the live Hono app.
 *
 * The document itself is assembled by `src/spec.ts` (shared with the runtime
 * `GET /api/v1/openapi.json` endpoint). This script adds what the emitter
 * needs on top: safe env bootstrapping, a parity check that fails when a
 * registered route is missing from the spec (instead of silently vanishing),
 * and a `--check` mode for CI.
 *
 * Usage:
 *   bun scripts/generate-openapi.ts          # regenerate openapi.yml
 *   bun scripts/generate-openapi.ts --check  # verify openapi.yml is up to date (CI)
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

// Safe defaults so importing the app never touches real infrastructure.
// NODE_ENV=test makes the database adaptor return a mock instance, and the
// dummy secrets satisfy import-time env validation in downstream packages.
// (NODE_ENV is typed read-only, hence Object.assign)
if (!process.env.NODE_ENV) Object.assign(process.env, { NODE_ENV: 'test' });
process.env.KEY_VAULTS_SECRET ??= 'openapi-spec-generation';
process.env.CLOUD_DATABASE_URL ??= 'postgresql://mock:mock@localhost:5432/mock';
process.env.QSTASH_TOKEN ??= 'mock-qstash-token';

const PKG_ROOT = path.join(import.meta.dirname, '..');
const SPEC_PATH = path.join(PKG_ROOT, 'openapi.yml');
const HTTP_METHODS = new Set(['DELETE', 'GET', 'PATCH', 'POST', 'PUT']);

// Real endpoints deliberately outside the API surface this spec describes.
const SPEC_EXEMPT = new Set([
  // Documentation-serving routes: the reference itself and the spec behind it.
  'GET /api/v1',
  'GET /api/v1/docs',
  'GET /api/v1/openapi.json',
  // Heterogeneous-model relays. These speak the upstream provider's protocol so
  // an Anthropic or OpenAI SDK can be pointed straight at this host: they take
  // that provider's request body, answer with its SSE event stream, and on
  // failure return its error envelope, not this API's. Describing them here
  // would republish someone else's contract as our own — and a spec entry has
  // to carry the JSON 200/400/.../500 set every other operation does, which an
  // endpoint that only ever streams cannot honestly claim.
  'POST /api/v1/anthropic/v1/messages',
  'POST /api/v1/openai/v1/responses',
]);

// Import after the env defaults above are in place.
const { honoApp } = await import('../src/app');
const { buildSpecDocument } = await import('../src/spec');
const YAML = await import('yaml');

const spec = await buildSpecDocument(honoApp);
const paths = (spec.paths ?? {}) as Record<string, Record<string, unknown>>;

// ---------- Parity check: every registered route must be in the spec ----------
const normalize = (routePath: string) => routePath.replaceAll(/:([^/]+)/g, '{$1}');

const registered = new Set(
  honoApp.routes
    .filter((r) => HTTP_METHODS.has(r.method))
    .map((r) => `${r.method} ${normalize(r.path)}`)
    .filter((endpoint) => !SPEC_EXEMPT.has(endpoint)),
);
const documented = new Set(
  Object.entries(paths).flatMap(([specPath, item]) =>
    Object.keys(item)
      .filter((method) => HTTP_METHODS.has(method.toUpperCase()))
      .map((method) => `${method.toUpperCase()} ${specPath}`),
  ),
);

const missing = [...registered].filter((endpoint) => !documented.has(endpoint));
const extra = [...documented].filter((endpoint) => !registered.has(endpoint));

if (missing.length > 0 || extra.length > 0) {
  if (missing.length > 0) {
    console.error(
      `✗ ${missing.length} route(s) missing from the spec (no hono-openapi validator/describeRoute attached):`,
    );
    for (const endpoint of missing) console.error(`  - ${endpoint}`);
  }
  for (const endpoint of extra) console.error(`  ? documented but not registered: ${endpoint}`);
  process.exit(1);
}

// ---------- Emit ----------
const output = YAML.stringify(spec, { aliasDuplicateObjects: false });

if (process.argv.includes('--check')) {
  const committed = readFileSync(SPEC_PATH, 'utf8');
  if (committed !== output) {
    console.error(
      '✗ openapi.yml is out of date with the routes. Run `bun generate:openapi` in packages/openapi and commit the result.',
    );
    process.exit(1);
  }
  console.log(`✓ openapi.yml is up to date (${documented.size} operations)`);
} else {
  writeFileSync(SPEC_PATH, output);
  console.log(
    `✓ openapi.yml written: ${documented.size} operations, ${Object.keys(paths).length} paths`,
  );
}

// The auth middleware registers a cache-cleanup interval at import time,
// which would otherwise keep the process alive.
process.exit(0);
