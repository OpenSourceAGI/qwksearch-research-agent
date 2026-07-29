/**
 * @fileoverview CLI script that exports the merged domain-rank dataset to
 * JSON, NDJSON, and/or CSV files.
 *
 * Loads `domain-rank-merged.json` and `domain-info.json`, normalises records
 * into a flat `{ rank, domain, source, score, info }` shape, and writes the
 * requested formats to an output directory (both configurable via
 * `--formats=` and `--out=` CLI args).
 */
import fs from 'fs/promises';
import { createWriteStream } from 'fs';
import path from 'path';

type Format = 'json' | 'csv' | 'ndjson';

const defaultFormats: Format[] = ['json', 'csv', 'ndjson'];

async function loadData() {
  const base = path.resolve(__dirname, '../data');
  const mergedPath = path.join(base, 'domain-rank-merged.json');
  const infoPath = path.join(base, 'domain-info.json');
  const merged = JSON.parse(await fs.readFile(mergedPath, 'utf8'));
  let info = {};
  try {
    info = JSON.parse(await fs.readFile(infoPath, 'utf8'));
  } catch (e) {
    // ignore
  }
  // If merged is an object mapping domain -> array, convert to array of objects
  if (!Array.isArray(merged) && merged && typeof merged === 'object') {
    const sample = Object.values(merged)[0];
    if (Array.isArray(sample)) {
      const converted = Object.entries(merged).map(([domain, arr]) => ({
        domain,
        name: arr[0] || '',
        domainRank: typeof arr[1] === 'number' ? arr[1] : 0,
        domainTitle: arr[2] || '',
        newsRank: typeof arr[3] === 'number' ? arr[3] : 0,
        newsTitle: arr[4] || '',
        langCode: arr[5] || ''
      }));
      return { merged: converted, info };
    }
  }
  return { merged, info };
}

function toCSV(records: any[]) {
  if (!records.length) return '';
  const keys = Object.keys(records[0]);
  const lines = [keys.join(',')];
  for (const r of records) {
    lines.push(keys.map(k => {
      const v = r[k] ?? '';
      const s = typeof v === 'string' ? v : JSON.stringify(v);
      return '"' + s.replace(/"/g, '""') + '"';
    }).join(','));
  }
  return lines.join('\n');
}

async function writeJSON(outDir: string, name: string, data: any) {
  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(path.join(outDir, name + '.json'), JSON.stringify(data, null, 2), 'utf8');
}

async function writeNDJSON(outDir: string, name: string, arr: any[]) {
  await fs.mkdir(outDir, { recursive: true });
  const fp = path.join(outDir, name + '.ndjson');
  const stream = createWriteStream(fp, { encoding: 'utf8' });
  for (const item of arr) {
    stream.write(JSON.stringify(item) + '\n');
  }
  stream.end();
  await new Promise(resolve => stream.on('finish', resolve));
}

async function writeCSVFile(outDir: string, name: string, arr: any[]) {
  await fs.mkdir(outDir, { recursive: true });
  const csv = toCSV(arr);
  await fs.writeFile(path.join(outDir, name + '.csv'), csv, 'utf8');
}

function makeRecords(merged: any[], info: Record<string, any>) {
  return merged.map((m: any) => {
    const domain = m.domain ?? m.name ?? '';
    const rank = m.rank ?? m.domainRank ?? 0;
    const source = m.source ?? m.newsTitle ?? m.domainTitle ?? m.name ?? '';
    const score = m.score ?? 0;
    return {
      rank,
      domain,
      source,
      score,
      info: info[domain] ?? {}
    };
  });
}

async function main() {
  const args = process.argv.slice(2);
  const formatsArg = args.find(a => a.startsWith('--formats='))?.split('=')[1];
  const outArg = args.find(a => a.startsWith('--out='))?.split('=')[1];
  const formats = formatsArg ? formatsArg.split(',') as Format[] : defaultFormats;
  const outDir = outArg ? path.resolve(process.cwd(), outArg) : path.resolve(process.cwd(), 'exports');

  const { merged, info } = await loadData();
  const records = makeRecords(Array.isArray(merged) ? merged : Object.values(merged), info || {});

  if (formats.includes('json')) {
    await writeJSON(outDir, 'domain-rank', records);
    console.log('Wrote JSON to', outDir);
  }
  if (formats.includes('ndjson')) {
    await writeNDJSON(outDir, 'domain-rank', records);
    console.log('Wrote NDJSON to', outDir);
  }
  if (formats.includes('csv')) {
    await writeCSVFile(outDir, 'domain-rank', records);
    console.log('Wrote CSV to', outDir);
  }
}

if (require.main === module) {
  main().catch(err => {
    console.error(err);
    process.exit(1);
  });
}
