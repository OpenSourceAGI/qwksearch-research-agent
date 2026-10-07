
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
const check = spawnSync(process.execPath, ['scripts/check.mjs'], { stdio: 'inherit' });
if (check.status) process.exit(check.status);
const root = path.resolve('extension'),
  out = path.resolve('output');
await fs.mkdir(out, { recursive: true });
async function walk(dir) {
  const files = [];
  for (const e of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    files.push(...(e.isDirectory() ? await walk(full) : [full]));
  }
  return files.sort();
}
const files = await walk(root),
  table = Array.from({ length: 256 }, (_, i) => {
    let c = i;
    for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
function crc(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = table[(c ^ b) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
const locals = [],
  central = [];
let offset = 0;
const inventory = [];
for (const file of files) {
  const bytes = await fs.readFile(file),
    name = Buffer.from(path.relative(root, file).replaceAll('\\', '/'));
  const hash = crc(bytes);
  const local = Buffer.alloc(30);
  local.writeUInt32LE(0x04034b50);
  local.writeUInt16LE(20, 4);
  local.writeUInt16LE(0x800, 6);
  local.writeUInt16LE(0x21, 12);
  local.writeUInt32LE(hash, 14);
  local.writeUInt32LE(bytes.length, 18);
  local.writeUInt32LE(bytes.length, 22);
  local.writeUInt16LE(name.length, 26);
  const head = Buffer.alloc(46);
  head.writeUInt32LE(0x02014b50);
  head.writeUInt16LE(20, 4);
  head.writeUInt16LE(20, 6);
  head.writeUInt16LE(0x800, 8);
  head.writeUInt16LE(0x21, 14);
  head.writeUInt32LE(hash, 16);
  head.writeUInt32LE(bytes.length, 20);
  head.writeUInt32LE(bytes.length, 24);
  head.writeUInt16LE(name.length, 28);
  head.writeUInt32LE(offset, 42);
  locals.push(local, name, bytes);
  central.push(head, name);
  offset += local.length + name.length + bytes.length;
  inventory.push({
    path: name.toString(),
    bytes: bytes.length,
    sha256: createHash('sha256').update(bytes).digest('hex'),
  });
}
const directory = Buffer.concat(central),
  end = Buffer.alloc(22);
end.writeUInt32LE(0x06054b50);
end.writeUInt16LE(files.length, 8);
end.writeUInt16LE(files.length, 10);
end.writeUInt32LE(directory.length, 12);
end.writeUInt32LE(offset, 16);
const version = JSON.parse(await fs.readFile(path.join(root, 'manifest.json'))).version;
const zip = Buffer.concat([...locals, directory, end]);
const name = `leotabs-${version}.zip`;
await fs.writeFile(path.join(out, name), zip);
await fs.writeFile(
  path.join(out, 'package-inventory.json'),
  JSON.stringify(
    { package: name, sha256: createHash('sha256').update(zip).digest('hex'), files: inventory },
    null,
    2,
  ),
);
console.log(
  `${name}: ${files.length} files, ${zip.length} bytes. Source and licenses included.`,
);
