
import { readdir, readFile, stat } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { createHash } from 'node:crypto';
const root = path.resolve('extension');
async function walk(dir) {
  const result = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    result.push(...(entry.isDirectory() ? await walk(full) : [full]));
  }
  return result;
}
const files = await walk(root),
  manifest = JSON.parse(await readFile(path.join(root, 'manifest.json'), 'utf8'));
const overlay = JSON.parse(await readFile(path.join(root, 'overlay-build.json'), 'utf8'));
for (const [file, expected] of Object.entries(overlay)) {
  const actual = createHash('sha256')
    .update(await readFile(path.join(root, file)))
    .digest('hex');
  if (actual !== expected)
    throw new Error('Overlay sources changed. Run npm run build before packaging.');
}
for (const file of files.filter((f) => f.endsWith('.js'))) {
  const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  if (result.status) throw new Error(result.stderr);
}
for (const file of [manifest.background.service_worker, manifest.options_ui.page])
  await stat(path.join(root, file.split('#')[0]));
for (const file of files.filter((f) => f.endsWith('.html'))) {
  const html = await readFile(file, 'utf8');
  if (/<script(?![^>]*\bsrc=)[^>]*>\s*[^<]/i.test(html) || /\son\w+=/i.test(html))
    throw new Error('Inline script in ' + file);
  for (const match of html.matchAll(/(?:src|href)="(?![a-z][a-z\d+.-]*:|#)([^"]+)"/gi))
    await stat(path.resolve(path.dirname(file), match[1].split(/[?#]/)[0]));
}
if (manifest.host_permissions?.length) throw new Error('Core must not require host access.');
console.log(
  `Checked ${files.length} packaged files; module syntax, entry points, assets and no mandatory host permissions passed.`,
);
