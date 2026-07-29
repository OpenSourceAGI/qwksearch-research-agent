import { describe, it, expect } from 'vitest';

describe('module smoke test', () => {
    it('imports the main entry point without throwing', async () => {
        const mod = await import('../src/scraper');
        expect(mod).toBeDefined();
        expect(typeof mod.JSDomScraper).toBe('function');
    });
});
