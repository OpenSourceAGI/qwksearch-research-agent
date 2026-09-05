/**
 * Bundles the Worker (`worker/index.ts`) with the LobeHub backend graph into a
 * single ESM module for `wrangler deploy`.
 *
 * Node-only packages that cannot run under workerd are aliased to shims (see
 * `worker/shims`); Cloudflare-native replacements are wired in the Worker.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import type { Plugin } from 'vite';
import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

const root = path.dirname(fileURLToPath(import.meta.url));
const shim = (name: string) => path.resolve(root, `worker/shims/${name}.ts`);

const rawMdPlugin: Plugin = {
  load(id) {
    const [filepath] = id.split('?');
    if (!filepath.endsWith('.md')) return;
    return `export default ${JSON.stringify(readFileSync(filepath, 'utf8'))};`;
  },
  name: 'lobe-worker-raw-md',
};

/** Packages that must be replaced wholesale inside the Worker bundle. */
const unsupportedModules: Record<string, string> = {
  '@electric-sql/pglite': shim('pglite'),
  // Optional native addons probed by discord.js / ws / canvas consumers.
  'bufferutil': shim('empty'),
  'canvas': shim('empty'),
  'erlpack': shim('empty'),
  'fsevents': shim('empty'),
  'utf-8-validate': shim('empty'),
  'zlib-sync': shim('empty'),
  // Node builtins that workerd does not provide (everything else is native under nodejs_compat).
  'child_process': shim('node-child_process'),
  'node:child_process': shim('node-child_process'),
  'node:perf_hooks': shim('node-perf_hooks'),
  'node:readline': shim('node-readline'),
  'node:tty': shim('node-tty'),
  'tty': shim('node-tty'),
  'perf_hooks': shim('node-perf_hooks'),
  'readline': shim('node-readline'),
  'formidable': shim('formidable'),
  'ioredis': shim('ioredis'),
  'linkedom': shim('linkedom'),
  'nodemailer': shim('nodemailer'),
  'oidc-provider': shim('oidc-provider'),
  'sharp': shim('sharp'),
  'undici': shim('undici'),
  'ws': shim('ws'),
};

/**
 * Node builtins workerd provides under `nodejs_compat`, bound statically so the
 * CommonJS `require()` calls rolldown leaves in the bundle (legacy deps such as
 * pg, ajv, aws-sdk) resolve without a runtime module loader.
 */
const WORKERD_BUILTINS = [
  'assert',
  'async_hooks',
  'buffer',
  'crypto',
  'diagnostics_channel',
  'dns',
  'events',
  'fs',
  'fs/promises',
  'http',
  'https',
  'module',
  'net',
  'os',
  'path',
  'process',
  'querystring',
  'stream',
  'stream/promises',
  'stream/web',
  'string_decoder',
  'timers',
  'timers/promises',
  'tls',
  'url',
  'util',
  'zlib',
];

const builtinIdent = (name: string) => `__lobe_builtin_${name.replaceAll('/', '_')}`;

const buildRequireShim = () => {
  const imports = WORKERD_BUILTINS.map(
    (name) => `import * as ${builtinIdent(name)} from "node:${name}";`,
  ).join('\n');
  // CommonJS consumers expect `module.exports` (e.g. `require('events')` IS
  // EventEmitter), which the ESM namespace exposes as `default`.
  const map = WORKERD_BUILTINS.map(
    (name) => `${JSON.stringify(name)}: __lobeCjs(${builtinIdent(name)})`,
  ).join(', ');

  return `import { createRequire as __lobeCreateRequire } from "node:module";
${imports}
const __lobeCjs = (ns) => (ns && ns.default !== undefined ? ns.default : ns);
const __lobeBuiltins = { ${map},
  "util/types": __lobeCjs(${builtinIdent('util')}).types,
  // Not provided by workerd: inert stand-ins so probing libraries take their fallback paths.
  "worker_threads": { isMainThread: true, parentPort: null, threadId: 0, Worker: class Worker { constructor() { throw new Error("worker_threads is not available on Cloudflare Workers"); } } },
  "v8": {},
  "vm": {},
  "http2": {},
  "child_process": {},
  "readline": {},
  "perf_hooks": {
    performance: globalThis.performance,
    PerformanceEntry: class PerformanceEntry {},
    PerformanceObserver: class PerformanceObserver { observe() {} disconnect() {} },
    constants: { NODE_PERFORMANCE_GC_MAJOR: 4, NODE_PERFORMANCE_GC_MINOR: 1, NODE_PERFORMANCE_GC_INCREMENTAL: 8, NODE_PERFORMANCE_GC_WEAKCB: 16, NODE_PERFORMANCE_GC_FLAGS_NO: 0, NODE_PERFORMANCE_GC_FLAGS_FORCED: 4 },
    monitorEventLoopDelay: () => ({ enable() {}, disable() {}, reset() {}, percentile: () => 0, min: 0, max: 0, mean: 0, stddev: 0 }),
  },
};
let __lobeCjsRequire;
const require = function (id) {
  const key = id.startsWith("node:") ? id.slice(5) : id;
  if (Object.prototype.hasOwnProperty.call(__lobeBuiltins, key)) return __lobeBuiltins[key];
  if (__lobeCjsRequire === undefined) {
    try { __lobeCjsRequire = __lobeCreateRequire(import.meta.url || "file:///worker/index.js"); } catch { __lobeCjsRequire = null; }
  }
  if (__lobeCjsRequire) return __lobeCjsRequire(id);
  throw new Error('Dynamic require of "' + id + '" is not supported on Cloudflare Workers');
};
`;
};

/**
 * Prepends a module-scoped `require` to every server chunk. Rolldown's CJS
 * interop probes `typeof require` at module init, so a lexical binding at the
 * top of the chunk is picked up by every converted CommonJS dependency.
 */
const workerRequireShimPlugin: Plugin = {
  apply: 'build',
  enforce: 'post',
  name: 'lobe-worker-require-shim',
  renderChunk(code) {
    // Rolldown's node-platform runtime evaluates `createRequire(import.meta.url)`
    // eagerly (`import{createRequire as e}from"node:module"; … p=e(import.meta.url)`).
    // `import.meta.url` is undefined in workerd, so point that call at the lazy
    // shim below, which also serves builtins from the static map.
    // renderChunk runs before minification, so the import may be aliased or not.
    const aliasMatch = code.match(
      /import\s*\{\s*createRequire(?:\s+as\s+([A-Za-z_$][\w$]*))?\s*\}\s*from\s*["']node:module["'];?/,
    );
    let patched = code;
    let touched = false;

    if (aliasMatch) {
      const alias = aliasMatch[1] ?? 'createRequire';
      const eager = new RegExp(`\\b${alias}\\(import\\.meta\\.url\\)`, 'g');
      if (eager.test(patched)) {
        patched = patched.replaceAll(eager, 'require');
        touched = true;
      }
    }

    patched = patched.replaceAll(
      /(?:const|let|var)\s+require\s*=\s*[A-Za-z_$][\w$]*\(import\.meta\.url\)\s*;?/g,
      () => {
        touched = true;
        return '';
      },
    );

    if (!touched && !/\brequire\b/.test(patched)) return null;
    return { code: buildRequireShim() + patched, map: null };
  },
};

/**
 * `tslib` ships a CJS build flagged `__esModule`, which rolldown's interop turns
 * into a namespace without `default` — breaking packages that do
 * `import tslib from 'tslib'`. The ES build has both named and default exports,
 * so every consumer (ESM or converted CJS) is pointed at it.
 */
const tslibEsm = path.resolve(
  root,
  'node_modules/.pnpm/tslib@2.8.1/node_modules/tslib/tslib.es6.mjs',
);

const unsupportedModulePlugin: Plugin = {
  enforce: 'pre',
  name: 'lobe-worker-unsupported-modules',
  resolveId(source) {
    if (source === 'tslib') return tslibEsm;
    // OpenTelemetry Node SDK bootstrap (auto-instrumentations, OTLP exporters)
    // cannot run on workerd; keep the `@opentelemetry/api` surface, drop the SDK.
    if (source === '@lobechat/observability-otel/node') return shim('observability-otel-node');
    const match = Object.keys(unsupportedModules).find(
      (mod) => source === mod || source.startsWith(`${mod}/`),
    );
    return match ? unsupportedModules[match] : null;
  },
};

export default defineConfig({
  build: {
    emptyOutDir: true,
    minify: process.env.WORKER_DEBUG_BUILD !== '1',
    outDir: path.resolve(root, process.env.WORKER_DEBUG_BUILD === '1' ? 'dist/worker-debug' : 'dist/worker'),
    reportCompressedSize: false,
    rolldownOptions: {
      external: ['cloudflare:workers'],
      input: path.resolve(root, 'worker/index.ts'),
      output: {
        chunkFileNames: 'chunks/[name]-[hash].js',
        entryFileNames: 'index.js',
        format: 'es',
        // Code splitting produced chunks referencing lazy `init_*` helpers that
        // live in other chunks (rolldown ESM/CJS interop); one module avoids it.
        inlineDynamicImports: true,
      },
    },
    sourcemap: false,
    ssr: true,
    target: 'esnext',
  },
  define: {
    '__CI__': 'false',
    '__DEV__': 'false',
    '__ELECTRON__': 'false',
    '__MOBILE__': 'false',
    '__TEST__': 'false',
    // Vite stubs `process.env` to `{}` for the webworker SSR target; LobeHub's env
    // schemas must keep reading the real Worker environment (nodejs_compat).
    'process.env': 'globalThis.process.env',
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
  plugins: [
    unsupportedModulePlugin,
    rawMdPlugin,
    tsconfigPaths({ loose: true, projects: [path.resolve(root, 'tsconfig.json')] }),
    workerRequireShimPlugin,
  ],
  publicDir: false,
  resolve: {
    alias: {
      '@/libs/i18n/serverTranslation': shim('serverTranslation'),
      'next/cache': shim('next-cache'),
      'next/headers': shim('next-headers'),
      'next/navigation': shim('next-navigation'),
      'next/server': shim('next-server'),
    },
    conditions: ['workerd', 'worker', 'edge-light', 'production', 'node', 'browser'],
    dedupe: ['@lobehub/editor', 'react', 'react-dom', 'drizzle-orm', 'zod', 'hono'],
  },
  root,
  ssr: {
    noExternal: true,
    resolve: {
      conditions: ['workerd', 'worker', 'edge-light', 'production', 'node', 'browser'],
      externalConditions: ['workerd', 'worker'],
    },
    // `node` keeps Node builtins external for both `import` and `require()`
    // (workerd provides them under nodejs_compat); the `webworker` target would
    // replace them with empty browser stubs inside CommonJS dependencies.
    target: 'node',
  },
});
