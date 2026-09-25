
// Canonical SVG -> runtime canvas paths + transparent manifest PNGs.
// Requires sharp: npm install --no-save sharp, or --sharp=/path/to/sharp.
import { readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const sharp = require(process.argv.find(arg => arg.startsWith('--sharp='))?.slice(8) || 'sharp');
const icons = new URL('../extension/icons/', import.meta.url);
const svg = await readFile(new URL('lion.svg', icons), 'utf8');
const viewBox = svg.match(/viewBox="([^"]+)"/)[1].split(/\s+/).map(Number);
const color = svg.match(/style="color:(#[0-9a-f]{6})"/i)[1];
const strokeWidth = Number(svg.match(/stroke-width="([\d.]+)"/)[1]);
const paths = [...svg.matchAll(/<path\b[^>]*\bd="([^"]+)"/g)].map(match => match[1]);
if (paths.length !== 2 || viewBox[2] !== viewBox[3]) throw new Error('Expected the selected square-viewBox Soft lion');
await writeFile(new URL('../extension/lib/identity-art.js', import.meta.url),
  `\n// Generated from icons/lion.svg by scripts/icons.mjs.\nexport const DEFAULT_IDENTITY_COLOR = ${JSON.stringify(color)};\nexport const IDENTITY_VIEWBOX = ${JSON.stringify(viewBox)};\nexport const IDENTITY_STROKE_WIDTH = ${strokeWidth};\nexport const IDENTITY_PATHS = ${JSON.stringify(paths, null, 2)};\n`);
for (const size of [16, 20, 24, 32, 48, 64, 128]) {
  await sharp(Buffer.from(svg), { density: 288 }).resize(size, size).png().toFile(fileURLToPath(new URL(`${size}.png`, icons)));
}
console.log('Built Soft lion artwork and seven transparent PNG sizes from icons/lion.svg.');
