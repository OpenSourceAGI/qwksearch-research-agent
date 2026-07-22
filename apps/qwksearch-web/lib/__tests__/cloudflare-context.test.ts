import { afterEach, describe, expect, it, vi } from 'vitest'
import { getCloudflareContext } from '../cloudflare-context'

afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe('getCloudflareContext', () => {
  it('falls back to process.env when cloudflare:workers is unavailable', () => {
    // In the node test environment `require("cloudflare:workers")` throws,
    // so the function should hit its process.env fallback path.
    vi.stubEnv('QWK_CF_CTX_TEST', 'present')
    const ctx = getCloudflareContext()
    expect(ctx.env.QWK_CF_CTX_TEST).toBe('present')
    expect(ctx.cf).toBeUndefined()
    expect(ctx.ctx).toBeNull()
  })

  it('returns a stable shape with env, cf and ctx keys', () => {
    const ctx = getCloudflareContext()
    expect(ctx).toHaveProperty('env')
    expect(ctx).toHaveProperty('cf')
    expect(ctx).toHaveProperty('ctx')
  })
})
