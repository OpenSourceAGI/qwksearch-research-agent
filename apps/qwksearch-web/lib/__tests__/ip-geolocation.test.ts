import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// is-vpn is imported by the module under test; mock it so we control the verdict.
const checkMock = vi.fn()
vi.mock('is-vpn', () => ({
  default: { check: (...args: any[]) => checkMock(...args) },
  check: (...args: any[]) => checkMock(...args),
}))

import { detectVpnAndLocation } from '../ip-geolocation'

let fetchMock: ReturnType<typeof vi.fn>

beforeEach(() => {
  checkMock.mockReset()
  fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('detectVpnAndLocation', () => {
  it('returns a neutral result when no IP is given', async () => {
    expect(await detectVpnAndLocation(null)).toEqual({ city: undefined, isVpn: false })
    expect(await detectVpnAndLocation(undefined)).toEqual({ city: undefined, isVpn: false })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('reports the city and vpn status on success', async () => {
    checkMock.mockResolvedValue(true)
    fetchMock.mockResolvedValue({ json: async () => ({ city: 'Berlin' }) })
    const result = await detectVpnAndLocation('1.2.3.4')
    expect(result).toEqual({ city: 'Berlin', isVpn: true })
  })

  it('treats a non-true vpn verdict as not-a-vpn', async () => {
    checkMock.mockResolvedValue(false)
    fetchMock.mockResolvedValue({ json: async () => ({ city: 'Paris' }) })
    const result = await detectVpnAndLocation('5.6.7.8')
    expect(result.isVpn).toBe(false)
    expect(result.city).toBe('Paris')
  })

  it('coerces a missing city to undefined', async () => {
    checkMock.mockResolvedValue(false)
    fetchMock.mockResolvedValue({ json: async () => ({}) })
    const result = await detectVpnAndLocation('9.9.9.9')
    expect(result.city).toBeUndefined()
  })

  it('recovers from a vpn check rejection', async () => {
    checkMock.mockRejectedValue(new Error('vpn service down'))
    fetchMock.mockResolvedValue({ json: async () => ({ city: 'Tokyo' }) })
    const result = await detectVpnAndLocation('2.2.2.2')
    expect(result).toEqual({ city: 'Tokyo', isVpn: false })
  })

  it('recovers from a geolocation fetch rejection', async () => {
    checkMock.mockResolvedValue(true)
    fetchMock.mockRejectedValue(new Error('geo down'))
    const result = await detectVpnAndLocation('3.3.3.3')
    expect(result).toEqual({ city: undefined, isVpn: true })
  })
})
