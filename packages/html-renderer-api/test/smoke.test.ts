import { describe, it, expect } from 'vitest';

// The package's declared entry point (src/scrapers/scraper-cloudflare.ts) is a
// Cloudflare Worker `fetch` handler that re-exports a Durable Object and
// transitively imports "@cloudflare/puppeteer", which expects the Cloudflare
// Workers runtime (wrangler) rather than plain Node. Importing it standalone
// under Vitest's node environment is not representative. Instead, per the
// fallback guidance, this smoke test imports a real pure utility module from
// within the package (src/utils/scraper-utils.ts) and exercises its actual
// exported functions.
describe('module smoke test', () => {
    it('imports scraper-utils and exposes working exports', async () => {
        const mod = await import('../src/utils/scraper-utils');
        expect(mod).toBeDefined();
        expect(typeof mod.parseRequestParams).toBe('function');
        expect(typeof mod.authenticateRequest).toBe('function');

        const request = new Request('https://example.com/?url=https://example.org&wait=100');
        const params = await mod.parseRequestParams(request);
        expect(params.url).toBe('https://example.org');
        expect(params.wait).toBe(100);

        const authResult = await mod.authenticateRequest(request, {} as any, params);
        expect(authResult.success).toBe(true);
    });
});
