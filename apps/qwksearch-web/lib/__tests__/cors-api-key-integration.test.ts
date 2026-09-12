/**
 * @fileoverview Integration tests for CORS requests and configurable API key requirement.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { withCors, corsPreflight } from '../cors'
import configManager from '@/lib/config'
import * as envModule from '@/lib/config/env'

describe('CORS and Configurable API Key Integration', () => {
  const EXTERNAL_SITE = 'https://my-external-research-tool.org'

  beforeEach(() => {
    configManager.updateConfig('api.requireApiKey', false)
  })

  it('allows CORS preflight (OPTIONS) from any external website', () => {
    const req = new Request('http://localhost/api/agent/search', {
      method: 'OPTIONS',
      headers: {
        origin: EXTERNAL_SITE,
        'access-control-request-method': 'POST',
        'access-control-request-headers': 'Content-Type, X-API-Key',
      },
    })

    const res = corsPreflight(req)
    expect(res.status).toBe(204)
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe(EXTERNAL_SITE)
    expect(res.headers.get('Access-Control-Allow-Methods')).toContain('POST')
    expect(res.headers.get('Access-Control-Allow-Headers')).toContain('X-API-Key')
    expect(res.headers.get('Vary')).toBe('Origin')
  })

  it('allows cross-origin requests from external site when requireApiKey is false (default)', async () => {
    const handler = withCors(async (req) => Response.json({ success: true, data: 'search results' }))

    const req = new Request('http://localhost/api/agent/search', {
      method: 'POST',
      headers: {
        origin: EXTERNAL_SITE,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: 'quantum computing' }),
    })

    const res = await handler(req)
    expect(res.status).toBe(200)
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe(EXTERNAL_SITE)
    const json = await res.json()
    expect(json.success).toBe(true)
  })

  it('blocks external request with 401 (including CORS headers) when requireApiKey is enabled in admin config', async () => {
    // Admin toggles Require API Key ON in admin panel
    configManager.updateConfig('api.requireApiKey', true)

    const handler = withCors(async () => Response.json({ success: true }))

    const req = new Request('http://localhost/api/agent/search', {
      method: 'POST',
      headers: {
        origin: EXTERNAL_SITE,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: 'quantum computing' }),
    })

    const res = await handler(req)
    expect(res.status).toBe(401)
    // Critical: CORS headers must be present on 401 response so external browser doesn't block response
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe(EXTERNAL_SITE)
    const json = await res.json()
    expect(json.error).toBe('Unauthorized')
    expect(json.message).toMatch(/API key is required/i)
  })

  it('allows external request when valid API key is provided via X-API-Key', async () => {
    configManager.updateConfig('api.requireApiKey', true)
    process.env.API_KEY = 'valid-test-key-123'

    const handler = withCors(async () => Response.json({ success: true, data: 'authorized results' }))

    const req = new Request('http://localhost/api/agent/search', {
      method: 'POST',
      headers: {
        origin: EXTERNAL_SITE,
        'Content-Type': 'application/json',
        'X-API-Key': 'valid-test-key-123',
      },
      body: JSON.stringify({ query: 'quantum computing' }),
    })

    const res = await handler(req)
    expect(res.status).toBe(200)
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe(EXTERNAL_SITE)
    const json = await res.json()
    expect(json.success).toBe(true)

    delete process.env.API_KEY
  })

  it('allows external request when valid API key is provided via Authorization: Bearer', async () => {
    configManager.updateConfig('api.requireApiKey', true)
    process.env.API_KEY = 'bearer-test-key'

    const handler = withCors(async () => Response.json({ success: true }))

    const req = new Request('http://localhost/api/agent/search', {
      method: 'POST',
      headers: {
        origin: EXTERNAL_SITE,
        'Content-Type': 'application/json',
        Authorization: 'Bearer bearer-test-key',
      },
    })

    const res = await handler(req)
    expect(res.status).toBe(200)
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe(EXTERNAL_SITE)

    delete process.env.API_KEY
  })

  it('allows external request when valid API key is provided via query parameter ?apiKey=', async () => {
    configManager.updateConfig('api.requireApiKey', true)
    process.env.API_KEY = 'query-param-key'

    const handler = withCors(async () => Response.json({ success: true }))

    const req = new Request(`http://localhost/api/agent/search?apiKey=query-param-key`, {
      headers: {
        origin: EXTERNAL_SITE,
      },
    })

    const res = await handler(req)
    expect(res.status).toBe(200)
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe(EXTERNAL_SITE)

    delete process.env.API_KEY
  })

  it('allows public routes to skip API key check even when requireApiKey is true', async () => {
    configManager.updateConfig('api.requireApiKey', true)

    const publicHandler = withCors(async () => Response.json({ openapi: '3.1.0' }), {
      skipApiKeyCheck: true,
    })

    const req = new Request('http://localhost/api/openapi', {
      headers: {
        origin: EXTERNAL_SITE,
      },
    })

    const res = await publicHandler(req)
    expect(res.status).toBe(200)
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe(EXTERNAL_SITE)
  })

  it('allows requests again after admin disables requireApiKey in config', async () => {
    configManager.updateConfig('api.requireApiKey', true)
    configManager.updateConfig('api.requireApiKey', 'false')

    const handler = withCors(async () => Response.json({ success: true }))

    const req = new Request('http://localhost/api/agent/search', {
      headers: {
        origin: EXTERNAL_SITE,
      },
    })

    const res = await handler(req)
    expect(res.status).toBe(200)
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe(EXTERNAL_SITE)
  })
})
