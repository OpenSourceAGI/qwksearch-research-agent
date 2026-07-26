import { afterEach, describe, expect, it, vi } from 'vitest'
import { getEnv } from '../env'

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('getEnv', () => {
  it('returns the value of a set environment variable', () => {
    vi.stubEnv('QWK_TEST_VAR', 'hello')
    expect(getEnv('QWK_TEST_VAR')).toBe('hello')
  })

  it('returns undefined for an unset variable', () => {
    expect(getEnv('QWK_DEFINITELY_UNSET_VAR_XYZ')).toBeUndefined()
  })

  it('reads the current process.env value', () => {
    vi.stubEnv('QWK_TEST_VAR', 'first')
    expect(getEnv('QWK_TEST_VAR')).toBe('first')
    vi.stubEnv('QWK_TEST_VAR', 'second')
    expect(getEnv('QWK_TEST_VAR')).toBe('second')
  })
})
