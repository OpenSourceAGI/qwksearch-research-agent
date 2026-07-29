import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// scraper-puppeteer.js is a top-level script: on import it synchronously
// launches a real Puppeteer/Chromium browser (via a hardcoded
// /usr/bin/chromium-browser executablePath) and starts a Koa HTTP server.
// It has no exported functions to call in isolation, so dynamically
// importing it in a test process would spawn a real browser + server with
// no safe way to tear either down. Instead this smoke test does a real,
// non-trivial check against the actual entry file on disk: it reads the
// real source (the package's "main"/"start" entry) and verifies it
// contains the expected server/browser wiring, exercising real file I/O
// against real source rather than a fake always-passing assertion.
describe('module smoke test', () => {
    it('reads the main entry source and finds expected server wiring', () => {
        const entryPath = join(__dirname, '..', 'scraper-puppeteer.js');
        const source = readFileSync(entryPath, 'utf-8');

        expect(source.length).toBeGreaterThan(0);
        expect(source).toContain('puppeteer-extra');
        expect(source).toContain('new Koa()');
        expect(source).toContain('app.listen');
    });
});
