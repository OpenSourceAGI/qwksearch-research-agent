/**
 * Assemble the static asset directory served by the Worker's ASSETS binding.
 *
 *   public/            → dist/client/            (favicons, fonts, og images…)
 *   dist/desktop/      → dist/client/_spa/       (main SPA, base `/_spa/`)
 *   dist/auth/         → dist/client/_spa-auth/  (auth SPA, base `/_spa-auth/`)
 *   dist/mobile/       → dist/client/_spa-mobile/ (optional mobile SPA)
 *
 * The HTML shells stay inside those folders; the Worker fetches them through
 * the binding and injects `window.__SERVER_CONFIG__` per request.
 */
import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const out = path.resolve(root, 'dist/client');

rmSync(out, { force: true, recursive: true });
mkdirSync(out, { recursive: true });

const copy = (from: string, to: string, required: boolean) => {
  const src = path.resolve(root, from);
  if (!existsSync(src)) {
    if (required) throw new Error(`Missing build output: ${from}`);
    console.log(`skip ${from} (not built)`);
    return;
  }
  cpSync(src, path.resolve(out, to), { recursive: true });
  console.log(`copied ${from} → dist/client/${to}`);
};

copy('public', '.', true);
copy('dist/desktop', '_spa', true);
copy('dist/auth', '_spa-auth', false);
copy('dist/mobile', '_spa-mobile', false);
