import { describe, expect, it } from 'vitest'
import stub, { env } from '../workers-stub'

describe('cloudflare-workers-stub', () => {
  it('exports an empty env object', () => {
    expect(env).toEqual({})
  })

  it('exposes env on the default export', () => {
    expect(stub.env).toBe(env)
  })
})
