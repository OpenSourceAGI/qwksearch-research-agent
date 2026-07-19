import { Hono } from 'hono';
import { Search } from '../../lib/search-web/search.js';

const app = new Hono();

const search = new Search();

app.get('/search', async (c) => {
    const query = c.req.query('q');
    const format = c.req.query('format') || 'json';
    const pageno = parseInt(c.req.query('pageno') || '1');
    const enginesParam = c.req.query('engines');
    const categoriesParam = c.req.query('categories');

    if (!query) {
        return c.json({ error: 'Missing query parameter' }, 400);
    }

    if (format !== 'json') {
        return c.json({ error: 'Only JSON format is supported' }, 400);
    }

    const engineNames = enginesParam ? enginesParam.split(',') : undefined;
    const categories = categoriesParam ? categoriesParam.split(',') : undefined;

    const results = await search.search(query, pageno, engineNames, categories);

    if (format === 'json') {
        return c.json({
            query,
            results
        });
    }

    return c.text('Only JSON format is supported in this version.');
});

app.get('/status', async (c) => {
    const engineParam = c.req.query('engine');

    if (engineParam) {
        const status = search.getEngineStatus(engineParam);
        if (!status) {
            return c.json({ error: 'Engine not found' }, 404);
        }
        return c.json(status);
    }

    const allStatuses = search.getAllEngineStatuses();
    return c.json({
        engines: allStatuses,
        summary: {
            total: allStatuses.length,
            active: allStatuses.filter((s: any) => s.status === 'active').length,
            failed: allStatuses.filter((s: any) => s.status === 'failed').length,
            disabled: allStatuses.filter((s: any) => s.status === 'disabled').length,
        }
    });
});

export default app;
