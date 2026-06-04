import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Hono } from 'hono';
import { Search } from '../src/search';
import { validateEngineResults, TEST_QUERIES } from './test-utils';

// Mock API setup
const app = new Hono();
const search = new Search();

app.get('/search', async (c) => {
    const query = c.req.query('q') || '';
    const pageno = parseInt(c.req.query('pageno') || '1');
    const engines = c.req.query('engines')?.split(',').filter(Boolean);
    const categories = c.req.query('categories')?.split(',').filter(Boolean);

    if (!query) {
        return c.json({ error: 'Query parameter is required' }, 400);
    }

    try {
        const results = await search.search(query, pageno, engines, categories);
        return c.json({
            query,
            pageno,
            engines: engines || 'all',
            categories: categories || 'all',
            results
        });
    } catch (error) {
        return c.json({ error: 'Search failed', message: (error as Error).message }, 500);
    }
});

describe('API Integration Tests', () => {
    it('should handle basic search query', async () => {
        const req = new Request('http://localhost/search?q=javascript');
        const res = await app.request(req);
        const data = await res.json();

        expect(res.status).toBe(200);
        expect(data.query).toBe('javascript');
        expect(data.results).toBeDefined();
        expect(Array.isArray(data.results)).toBe(true);
        expect(validateEngineResults(data.results)).toBe(true);
    }, 60000);

    it('should require query parameter', async () => {
        const req = new Request('http://localhost/search');
        const res = await app.request(req);
        const data = await res.json();

        expect(res.status).toBe(400);
        expect(data.error).toBe('Query parameter is required');
    });

    it('should filter by engines', async () => {
        const req = new Request('http://localhost/search?q=react&engines=github,npm');
        const res = await app.request(req);
        const data = await res.json();

        expect(res.status).toBe(200);
        expect(data.engines).toEqual(['github', 'npm']);

        if (data.results.length > 0) {
            data.results.forEach((result: any) => {
                expect(['github', 'npm']).toContain(result.engine);
            });
        }
    }, 60000);

    it('should filter by categories', async () => {
        const req = new Request('http://localhost/search?q=ubuntu&categories=torrent');
        const res = await app.request(req);
        const data = await res.json();

        expect(res.status).toBe(200);
        expect(data.categories).toEqual(['torrent']);
    }, 60000);

    it('should handle pagination', async () => {
        const req = new Request('http://localhost/search?q=python&pageno=2');
        const res = await app.request(req);
        const data = await res.json();

        expect(res.status).toBe(200);
        expect(data.pageno).toBe(2);
    }, 60000);

    describe('Common Query Tests', () => {
        it('should search for "javascript"', async () => {
            const req = new Request('http://localhost/search?q=javascript');
            const res = await app.request(req);
            const data = await res.json();

            expect(res.status).toBe(200);
            expect(data.results.length).toBeGreaterThan(0);
        }, 60000);

        it('should search for "linux"', async () => {
            const req = new Request('http://localhost/search?q=linux');
            const res = await app.request(req);
            const data = await res.json();

            expect(res.status).toBe(200);
            expect(data.results.length).toBeGreaterThan(0);
        }, 60000);

        it('should search for "ubuntu torrent" in torrent engines', async () => {
            const req = new Request('http://localhost/search?q=ubuntu&categories=torrent');
            const res = await app.request(req);
            const data = await res.json();

            expect(res.status).toBe(200);
            expect(data.results).toBeDefined();
        }, 60000);

        it('should search for "github" in code engines', async () => {
            const req = new Request('http://localhost/search?q=react&engines=github');
            const res = await app.request(req);
            const data = await res.json();

            expect(res.status).toBe(200);
            if (data.results.length > 0) {
                expect(data.results[0].engine).toBe('github');
            }
        }, 60000);
    });
});
