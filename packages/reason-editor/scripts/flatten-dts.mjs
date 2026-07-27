/**
 * unplugin-dts emits declarations under dist/src/, but package.json
 * exports/typesVersions reference them at dist/ (e.g.
 * ./dist/extensions/Bold/index.d.ts). Hoist the dist/src tree into dist
 * after the library build so the published type paths resolve.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const distDir = path.join(root, 'dist');
const srcDir = path.join(distDir, 'src');

if (!fs.existsSync(srcDir)) {
  process.exit(0);
}

function moveInto(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const fromPath = path.join(from, entry.name);
    const toPath = path.join(to, entry.name);
    if (entry.isDirectory()) {
      moveInto(fromPath, toPath);
    } else {
      fs.renameSync(fromPath, toPath);
    }
  }
  fs.rmdirSync(from);
}

moveInto(srcDir, distDir);
console.log('[flatten-dts] moved dist/src/* into dist/');
