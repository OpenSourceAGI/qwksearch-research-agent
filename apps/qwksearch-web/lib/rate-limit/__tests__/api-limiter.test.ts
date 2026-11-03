/**
 * @fileoverview The `/api/*` rate limiter, run against a real in-memory SQLite
 * built from the migration that ships its tables: rule matching, settings
 * storage, the shared counter, the 429, and that it fails open.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'
import type { QueryDB } from '@/lib/database'
import {
  DEFAULT_API_RATE_LIMIT_SETTINGS,
  matchesPattern,
  normalizeApiRateLimitSettings,
  normalizePattern,
  parseExemptPaths,
  resolveRateLimitRule,
  type ApiRateLimitSettings,
} from '../api-rules'
import {
  getApiRateLimitSettings,
  invalidateApiRateLimitSettingsCache,
  readApiRateLimitSettings,
  saveApiRateLimitSettings,
  SETTINGS_CACHE_MS,
} from '../api-settings'
import {
  checkApiRateLimit,
  countOpenWindows,
  enforceApiRateLimit,
  getClientKey,
  listActiveBuckets,
  rateLimitedResponse,
  resetCounters,
  sweepExpiredCounters,
  withRateLimitHeaders,
} from '../api-limiter'

const MIGRATION = resolve(__dirname, '../../../drizzle/0014_add_api_rate_limit.sql')

async function freshDb(): Promise<QueryDB> {
  const client = createClient({ url: ':memory:' })
  for (const statement of readFileSync(MIGRATION, 'utf8').split('--> statement-breakpoint')) {
    await client.execute(statement)
  }
  return drizzle(client) as unknown as QueryDB
}

const settings = (patch: Partial<ApiRateLimitSettings> = {}): ApiRateLimitSettings =>
  normalizeApiRateLimitSettings(patch, {
    ...DEFAULT_API_RATE_LIMIT_SETTINGS,
    overrides: [],
  })

const req = (path: string, ip = '203.0.113.7', method = 'GET') =>
  new Request(`https://qwksearch.com${path}`, {
    method,
    headers: { 'cf-connecting-ip': ip },
  })

// A fixed clock, mid-window: 1_000_040 s is 20 s into a 60 s window.
const NOW = 1_000_040_000

beforeEach(() => {
  invalidateApiRateLimitSettingsCache()
})

describe('pattern matching', () => {
  it('matches exact paths exactly', () => {
    expect(matchesPattern('/api/scraper', '/api/scraper')).toBe(true)
    expect(matchesPattern('/api/scraper', '/api/scraper/')).toBe(true)
    expect(matchesPattern('/api/scraper', '/api/scraper2')).toBe(false)
    expect(matchesPattern('/api/scraper', '/api/scraper/x')).toBe(false)
  })

  it('lets a trailing /* cover the bare path and everything under it', () => {
    expect(matchesPattern('/api/speech/*', '/api/speech')).toBe(true)
    expect(matchesPattern('/api/speech/*', '/api/speech/tts')).toBe(true)
    expect(matchesPattern('/api/speech/*', '/api/speech/a/b')).toBe(true)
    expect(matchesPattern('/api/speech/*', '/api/speechless')).toBe(false)
  })

  it('treats * in the middle as a wildcard and every other character literally', () => {
    expect(matchesPattern('/api/doc/*/share', '/api/doc/documents/share')).toBe(true)
    expect(matchesPattern('/api/v1.0/*', '/api/v1x0/a')).toBe(false)
    expect(matchesPattern('/api/v1.0/*', '/api/v1.0/a')).toBe(true)
  })

  it('normalises patterns and drops ones that are not paths', () => {
    expect(normalizePattern(' api/agent/** ')).toBe('/api/agent/*')
    expect(normalizePattern('/api/user/')).toBe('/api/user')
    expect(normalizePattern('')).toBeNull()
    expect(normalizePattern(42)).toBeNull()
    expect(parseExemptPaths('/api/a\n\n/api/b, /api/a')).toEqual(['/api/a', '/api/b'])
  })
})

describe('resolveRateLimitRule', () => {
  const s = settings({
    requestsPerWindow: 100,
    windowSeconds: 60,
    overrides: [
      { pattern: '/api/agent/chat', limit: 5, windowSeconds: 10 },
      { pattern: '/api/agent/*', limit: 20, windowSeconds: 60 },
    ],
    exemptPaths: '/api/auth/*\n/api/admin/*',
  })

  it('ignores anything outside /api', () => {
    expect(resolveRateLimitRule(s, '/')).toBeNull()
    expect(resolveRateLimitRule(s, '/apiary')).toBeNull()
    expect(resolveRateLimitRule(s, '/docs/api/x')).toBeNull()
  })

  it('counts nothing when switched off', () => {
    expect(resolveRateLimitRule({ ...s, enabled: false }, '/api/agent/chat')).toBeNull()
  })

  it('checks exemptions before overrides', () => {
    expect(resolveRateLimitRule(s, '/api/auth/get-session')).toEqual({ kind: 'exempt', pattern: '/api/auth/*' })
  })

  it('takes the first matching override, in order', () => {
    expect(resolveRateLimitRule(s, '/api/agent/chat')).toMatchObject({ kind: 'override', limit: 5, windowSeconds: 10 })
    expect(resolveRateLimitRule(s, '/api/agent/search')).toMatchObject({ kind: 'override', limit: 20 })
  })

  it('falls back to the default — including for routes that do not exist yet', () => {
    expect(resolveRateLimitRule(s, '/api/v1/transcribe')).toEqual({
      kind: 'default',
      id: 'default',
      limit: 100,
      windowSeconds: 60,
    })
  })

  it('ships with the admin, auth and collaboration routes exempt', () => {
    for (const path of ['/api/admin/rate-limit', '/api/auth/sign-in/email', '/api/collaboration/access']) {
      expect(resolveRateLimitRule(DEFAULT_API_RATE_LIMIT_SETTINGS, path)?.kind).toBe('exempt')
    }
  })
})

describe('normalizeApiRateLimitSettings', () => {
  it('clamps numbers and keeps unnamed fields', () => {
    const base = settings({ requestsPerWindow: 50 })
    const next = normalizeApiRateLimitSettings({ windowSeconds: 0 }, base)
    expect(next.windowSeconds).toBe(1)
    expect(next.requestsPerWindow).toBe(50)
    expect(normalizeApiRateLimitSettings({ requestsPerWindow: -3 }).requestsPerWindow).toBe(1)
    expect(normalizeApiRateLimitSettings({ windowSeconds: 10 ** 9 }).windowSeconds).toBe(86400)
  })

  it('reads overrides from a stored JSON string and drops blank or duplicate rows', () => {
    const next = normalizeApiRateLimitSettings({
      overrides: JSON.stringify([
        { pattern: '/api/a', limit: '7', windowSeconds: 30 },
        { pattern: '', limit: 1 },
        { pattern: '/api/a', limit: 9 },
        { pattern: '/api/b', limit: 0 },
      ]),
    })
    expect(next.overrides).toEqual([
      { pattern: '/api/a', limit: 7, windowSeconds: 30 },
      { pattern: '/api/b', limit: 1, windowSeconds: 60 },
    ])
  })

  it('keeps the current overrides when the stored value is not valid JSON', () => {
    const base = settings({ overrides: [{ pattern: '/api/x', limit: 3, windowSeconds: 5 }] })
    expect(normalizeApiRateLimitSettings({ overrides: '{oops' }, base).overrides).toEqual(base.overrides)
  })

  it('accepts booleans in the forms a form or a row sends', () => {
    expect(normalizeApiRateLimitSettings({ enabled: 'false' }).enabled).toBe(false)
    expect(normalizeApiRateLimitSettings({ enabled: 0 }).enabled).toBe(false)
    expect(normalizeApiRateLimitSettings({ enabled: 1 }).enabled).toBe(true)
  })
})

describe('settings storage', () => {
  it('returns the defaults before anything is saved', async () => {
    const db = await freshDb()
    expect(await readApiRateLimitSettings(db)).toEqual(DEFAULT_API_RATE_LIMIT_SETTINGS)
  })

  it('saves a partial patch over what is stored and reads it back', async () => {
    const db = await freshDb()
    await saveApiRateLimitSettings(db, { requestsPerWindow: 42 }, 'admin@example.com')
    const saved = await saveApiRateLimitSettings(db, {
      overrides: [{ pattern: '/api/v1/*', limit: 3, windowSeconds: 10 }],
    })

    expect(saved.requestsPerWindow).toBe(42)
    expect(await readApiRateLimitSettings(db)).toEqual(saved)
    expect(saved.overrides).toEqual([{ pattern: '/api/v1/*', limit: 3, windowSeconds: 10 }])
  })

  it('caches per isolate for SETTINGS_CACHE_MS, and a save clears the cache', async () => {
    const db = await freshDb()
    const first = await getApiRateLimitSettings(db, NOW)
    expect(first.requestsPerWindow).toBe(300)

    // Written behind the cache's back, as another isolate would.
    const client = (db as any).$client
    await client.execute(
      "INSERT INTO api_rate_limit_settings (id, requests_per_window) VALUES ('global', 7)",
    )
    expect((await getApiRateLimitSettings(db, NOW + 1000)).requestsPerWindow).toBe(300)
    expect((await getApiRateLimitSettings(db, NOW + SETTINGS_CACHE_MS + 1)).requestsPerWindow).toBe(7)

    await saveApiRateLimitSettings(db, { requestsPerWindow: 9 })
    expect((await getApiRateLimitSettings(db, NOW + SETTINGS_CACHE_MS + 2)).requestsPerWindow).toBe(9)
  })

  it('falls back to the defaults when the table is missing', async () => {
    const client = createClient({ url: ':memory:' })
    const db = drizzle(client) as unknown as QueryDB
    vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(await readApiRateLimitSettings(db)).toEqual(DEFAULT_API_RATE_LIMIT_SETTINGS)
  })
})

describe('checkApiRateLimit', () => {
  it('allows up to the limit, then refuses, then allows again in the next window', async () => {
    const db = await freshDb()
    const s = settings({ requestsPerWindow: 3, windowSeconds: 60 })

    const results = []
    for (let i = 0; i < 4; i++) {
      results.push(await checkApiRateLimit(db, req('/api/search/engines'), { settings: s, now: NOW }))
    }
    expect(results.map((r) => r?.allowed)).toEqual([true, true, true, false])
    expect(results.map((r) => r?.remaining)).toEqual([2, 1, 0, 0])
    // The window opened at 1_000_020 and closes 60 s later.
    expect(results[0]?.resetAt).toBe(1_000_080)

    const next = await checkApiRateLimit(db, req('/api/search/engines'), { settings: s, now: NOW + 60_000 })
    expect(next?.allowed).toBe(true)
  })

  it('counts each client separately', async () => {
    const db = await freshDb()
    const s = settings({ requestsPerWindow: 1 })

    expect((await checkApiRateLimit(db, req('/api/user', '1.1.1.1'), { settings: s, now: NOW }))?.allowed).toBe(true)
    expect((await checkApiRateLimit(db, req('/api/user', '1.1.1.1'), { settings: s, now: NOW }))?.allowed).toBe(false)
    expect((await checkApiRateLimit(db, req('/api/user', '2.2.2.2'), { settings: s, now: NOW }))?.allowed).toBe(true)
  })

  it('shares the default bucket across routes, but gives each override its own', async () => {
    const db = await freshDb()
    const s = settings({
      requestsPerWindow: 2,
      overrides: [{ pattern: '/api/agent/chat', limit: 1, windowSeconds: 60 }],
    })
    const check = (path: string) => checkApiRateLimit(db, req(path), { settings: s, now: NOW })

    expect((await check('/api/user'))?.allowed).toBe(true)
    expect((await check('/api/config'))?.allowed).toBe(true)
    expect((await check('/api/geolocation'))?.allowed).toBe(false)

    expect((await check('/api/agent/chat'))?.allowed).toBe(true)
    expect((await check('/api/agent/chat'))?.allowed).toBe(false)
  })

  it('does not count exempt paths, preflights, non-API paths, or anything when off', async () => {
    const db = await freshDb()
    const s = settings({ requestsPerWindow: 1, exemptPaths: '/api/auth/*' })

    expect(await checkApiRateLimit(db, req('/api/auth/get-session'), { settings: s, now: NOW })).toBeNull()
    expect(await checkApiRateLimit(db, req('/api/user', undefined, 'OPTIONS'), { settings: s, now: NOW })).toBeNull()
    expect(await checkApiRateLimit(db, req('/search'), { settings: s, now: NOW })).toBeNull()
    expect(
      await checkApiRateLimit(db, req('/api/user'), { settings: { ...s, enabled: false }, now: NOW }),
    ).toBeNull()
    expect(await countOpenWindows(db, NOW / 1000)).toBe(0)
  })

  it('reads the stored settings when none are passed', async () => {
    const db = await freshDb()
    await saveApiRateLimitSettings(db, { requestsPerWindow: 1, overrides: [] })

    expect((await checkApiRateLimit(db, req('/api/user'), { now: NOW }))?.allowed).toBe(true)
    expect((await checkApiRateLimit(db, req('/api/user'), { now: NOW }))?.allowed).toBe(false)
  })

  it('occasionally sweeps closed windows in the background', async () => {
    const db = await freshDb()
    const s = settings({ requestsPerWindow: 10, windowSeconds: 60 })
    await checkApiRateLimit(db, req('/api/user', '9.9.9.9'), { settings: s, now: NOW })

    const waitUntil = vi.fn()
    await checkApiRateLimit(db, req('/api/user'), {
      settings: s,
      now: NOW + 120_000,
      waitUntil,
      random: () => 0,
    })
    expect(waitUntil).toHaveBeenCalledTimes(1)
    await waitUntil.mock.calls[0][0]
    const left = await listActiveBuckets(db, 0)
    expect(left.map((b) => b.clientKey)).toEqual(['203.0.113.7'])
  })
})

describe('the 429 and the headers', () => {
  it('answers with JSON, Retry-After and RateLimit-* headers', async () => {
    const db = await freshDb()
    const s = settings({ requestsPerWindow: 1, windowSeconds: 60 })
    await checkApiRateLimit(db, req('/api/user'), { settings: s, now: NOW })
    const decision = (await checkApiRateLimit(db, req('/api/user'), { settings: s, now: NOW }))!

    const res = rateLimitedResponse(decision, NOW)
    expect(res.status).toBe(429)
    // 20 s into a 60 s window: 40 s left.
    expect(res.headers.get('Retry-After')).toBe('40')
    expect(res.headers.get('RateLimit-Limit')).toBe('1')
    expect(res.headers.get('RateLimit-Remaining')).toBe('0')
    expect(await res.json()).toMatchObject({ error: 'rate_limited', retryAfter: 40, limit: 1 })
  })

  it('adds the headers to an allowed response, copying it when its headers are immutable', async () => {
    const db = await freshDb()
    const decision = (await checkApiRateLimit(db, req('/api/user'), {
      settings: settings({ requestsPerWindow: 5 }),
      now: NOW,
    }))!

    const plain = withRateLimitHeaders(new Response('ok'), decision, NOW)
    expect(plain.headers.get('RateLimit-Remaining')).toBe('4')

    const frozen = new Response('ok', { status: 201 })
    Object.defineProperty(frozen, 'headers', {
      value: new Proxy(new Headers(), {
        get(target, prop) {
          if (prop === 'set') return () => { throw new TypeError('immutable') }
          const value = Reflect.get(target, prop)
          return typeof value === 'function' ? value.bind(target) : value
        },
      }),
    })
    const copied = withRateLimitHeaders(frozen, decision, NOW)
    expect(copied).not.toBe(frozen)
    expect(copied.status).toBe(201)
    expect(await copied.text()).toBe('ok')
  })
})

describe('enforceApiRateLimit', () => {
  it('returns a 429 to send once the client is over', async () => {
    const db = await freshDb()
    await saveApiRateLimitSettings(db, { requestsPerWindow: 1, overrides: [] })

    const first = await enforceApiRateLimit(db, req('/api/v1/transcribe'))
    expect(first?.limited).toBeUndefined()
    expect(first?.decorate?.(new Response('x')).headers.get('RateLimit-Limit')).toBe('1')

    const second = await enforceApiRateLimit(db, req('/api/v1/transcribe'))
    expect(second?.limited?.status).toBe(429)
  })

  it('fails open when the counter table is missing', async () => {
    const db = drizzle(createClient({ url: ':memory:' })) as unknown as QueryDB
    vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(await enforceApiRateLimit(db, req('/api/user'))).toBeNull()
  })
})

describe('admin helpers', () => {
  it('lists the busiest open windows and resets one or all', async () => {
    const db = await freshDb()
    const s = settings({ requestsPerWindow: 10, overrides: [{ pattern: '/api/speech/*', limit: 2, windowSeconds: 60 }] })
    for (let i = 0; i < 3; i++) await checkApiRateLimit(db, req('/api/user', '1.1.1.1'), { settings: s, now: NOW })
    await checkApiRateLimit(db, req('/api/speech/tts', '2001:db8::1'), { settings: s, now: NOW })

    const buckets = await listActiveBuckets(db, NOW / 1000)
    expect(buckets.map((b) => [b.clientKey, b.rule, b.count])).toEqual([
      ['1.1.1.1', 'default', 3],
      ['2001:db8::1', '/api/speech/*', 1],
    ])

    expect(await resetCounters(db, buckets[0].bucket)).toBe(1)
    expect((await listActiveBuckets(db, NOW / 1000)).length).toBe(1)
    expect(await resetCounters(db)).toBe(1)
    expect(await countOpenWindows(db, NOW / 1000)).toBe(0)
  })

  it('sweeps only windows that have closed', async () => {
    const db = await freshDb()
    const s = settings({ requestsPerWindow: 10, windowSeconds: 60 })
    await checkApiRateLimit(db, req('/api/user'), { settings: s, now: NOW })
    expect(await sweepExpiredCounters(db, NOW / 1000)).toBe(0)
    expect(await sweepExpiredCounters(db, NOW / 1000 + 3600)).toBe(1)
  })
})

describe('getClientKey', () => {
  it('prefers cf-connecting-ip, then x-real-ip, then the first x-forwarded-for hop', () => {
    const h = (headers: Record<string, string>) => new Request('https://x/api', { headers })
    expect(getClientKey(h({ 'cf-connecting-ip': '1.1.1.1', 'x-forwarded-for': '9.9.9.9' }))).toBe('1.1.1.1')
    expect(getClientKey(h({ 'x-real-ip': '2.2.2.2' }))).toBe('2.2.2.2')
    expect(getClientKey(h({ 'x-forwarded-for': '3.3.3.3, 10.0.0.1' }))).toBe('3.3.3.3')
    expect(getClientKey(h({}))).toBe('unknown')
  })
})
