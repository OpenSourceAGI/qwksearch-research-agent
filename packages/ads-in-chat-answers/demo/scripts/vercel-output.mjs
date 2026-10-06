// Writes the Vercel Build Output (https://vercel.com/docs/build-output-api)
// for the demo: the Vite build as static files, and each `server/*.js`
// handler bundled by esbuild into an Edge function at `/api/<name>`.
//
// Why not Vercel's zero-config `api/` folder: the handlers import the
// package's TypeScript source from outside the demo directory, and Vercel's
// edge builder copied `api/*.js` without following those imports (checked
// with `vercel build`), so the deployed function would have failed on its
// first import. Bundling here leaves nothing to resolve at runtime.
import { cp, mkdir, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const root = fileURLToPath(new URL('..', import.meta.url));
const out = `${root}.vercel/output`;
const FUNCTIONS = ['answer', 'keywords'];

await rm(out, { recursive: true, force: true });
await mkdir(`${out}/static`, { recursive: true });
await cp(`${root}dist`, `${out}/static`, { recursive: true });

for (const name of FUNCTIONS) {
  const dir = `${out}/functions/api/${name}.func`;
  await build({
    entryPoints: [`${root}server/${name}.js`],
    outfile: `${dir}/index.js`,
    bundle: true,
    format: 'esm',
    platform: 'neutral',
    target: 'es2022',
    minify: true,
    logLevel: 'warning',
  });
  await writeFile(
    `${dir}/.vc-config.json`,
    JSON.stringify({ runtime: 'edge', entrypoint: 'index.js' }, null, 2)
  );
}

await writeFile(
  `${out}/config.json`,
  JSON.stringify({ version: 3, routes: [{ handle: 'filesystem' }] }, null, 2)
);
console.log(`Vercel output written: static + ${FUNCTIONS.map((f) => `/api/${f}`).join(', ')}`);
