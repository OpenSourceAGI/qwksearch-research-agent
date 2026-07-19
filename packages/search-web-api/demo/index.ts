
import { Hono } from 'hono';
import { apiReference } from '@scalar/hono-api-reference';
import searchRoute from './routes/search.js';
import autocompleteRoute from './routes/autocomplete.js';
import { openAPISpec } from './openapi.js';

const app = new Hono();

// Scalar API Reference endpoint
// @ts-ignore: Type definition mismatch but runtime works
app.get('/docs', apiReference({
    // @ts-ignore
    spec: {
        url: '/openapi.json',
    }
}));

// OpenAPI JSON spec endpoint
app.get('/openapi.json', (c) => {
    return c.json(openAPISpec);
});

app.route('/', searchRoute);
app.route('/autocomplete', autocompleteRoute);

app.get('/', (c) => {
    return c.text('SearXNG HonoX API is running! Visit /docs for API documentation.');
});

const port = 3000;
console.log(`Server is running on port ${port}`);

// Bun's native server
export default {
    port,
    fetch: app.fetch,
};
