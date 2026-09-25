
// The only generated runtime file. No remote code or runtime dependencies.
import { build } from 'esbuild';
import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
await fs.mkdir('output', { recursive: true });
const {metafile: meta} = await build({
  entryPoints: ['extension/ui/overlay-entry.js'], bundle: true, format: 'iife',
  loader: {'.css':'text'}, outfile: 'extension/overlay.js', metafile: true,
});
await fs.writeFile('output/overlay-meta.json', JSON.stringify(meta));
const hashes = {};
for (const file of [...Object.keys(meta.inputs), 'extension/overlay.js'])
  hashes[file.replace('extension/', '')] = createHash('sha256')
    .update(await fs.readFile(file))
    .digest('hex');
await fs.writeFile('extension/overlay-build.json', JSON.stringify(hashes, null, 2));
