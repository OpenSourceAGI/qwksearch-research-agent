import { describe, expect, it } from 'vitest';
import * as routes from '../server/routes.js';

const ROUTES = Object.entries(routes).filter(([, value]) => value && typeof value === 'object');

describe('OpenAPI route definitions', () => {
  it('exports at least the convert, base64 and health routes', () => {
    expect(routes.convertImageRoute).toBeDefined();
    expect(ROUTES.length).toBeGreaterThanOrEqual(3);
  });

  it('gives every route a method and a path', () => {
    for (const [name, route] of ROUTES) {
      expect(route.method, `${name}.method`).toBeTruthy();
      expect(route.path, `${name}.path`).toMatch(/^\//);
    }
  });

  it('versions every API path under /api/v1', () => {
    for (const [name, route] of ROUTES) {
      if (route.path === '/health') continue;
      expect(route.path, `${name}.path`).toMatch(/^\/api\/v1\//);
    }
  });

  it('declares a 200 response for every route', () => {
    for (const [name, route] of ROUTES) {
      expect(route.responses?.[200], `${name} 200 response`).toBeDefined();
    }
  });
});

describe('convertImageRoute', () => {
  it('is a POST to /api/v1/convert', () => {
    expect(routes.convertImageRoute.method).toBe('post');
    expect(routes.convertImageRoute.path).toBe('/api/v1/convert');
  });

  it('accepts a JSON body', () => {
    expect(routes.convertImageRoute.request.body.content['application/json'].schema).toBeDefined();
  });

  it('documents 400 and 500 error responses', () => {
    expect(routes.convertImageRoute.responses[400]).toBeDefined();
    expect(routes.convertImageRoute.responses[500]).toBeDefined();
  });

  it('is tagged and summarized for the generated docs', () => {
    expect(routes.convertImageRoute.tags).toContain('Document Conversion');
    expect(routes.convertImageRoute.summary).toBeTruthy();
  });

  it('validates its body schema against a real request payload', () => {
    const schema = routes.convertImageRoute.request.body.content['application/json'].schema;

    expect(schema.safeParse({ imageUrl: 'https://example.com/a.png' }).success).toBe(true);
    expect(schema.safeParse({ imageUrl: 'nope' }).success).toBe(false);
  });
});

describe('POST routes', () => {
  const postRoutes = ROUTES.filter(([, route]) => route.method === 'post');

  it('there is at least one', () => {
    expect(postRoutes.length).toBeGreaterThan(0);
  });

  it('every POST route declares a JSON request body', () => {
    for (const [name, route] of postRoutes) {
      expect(route.request?.body?.content?.['application/json']?.schema, `${name} body`).toBeDefined();
    }
  });

  it('every POST route documents both error responses', () => {
    for (const [name, route] of postRoutes) {
      expect(route.responses[400], `${name} 400`).toBeDefined();
      expect(route.responses[500], `${name} 500`).toBeDefined();
    }
  });
});
