import { describe, expect, it } from 'vitest'
import {
  checkGuestRateLimit,
  getGuestRateLimitStatus,
  checkTTSRateLimit,
  getTrackedIPCount,
} from '../guestRateLimiter'

// Unique IP per test avoids in-memory state bleed across the file.
let ipSeed = 0
const freshIP = () => `192.0.2.${++ipSeed}`
const freshTTSKey = () => `tts-user-${++ipSeed}`

describe('checkGuestRateLimit', () => {
  it('allows a fresh IP and returns full quota minus one', () => {
    const result = checkGuestRateLimit(freshIP())
    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(99)
    expect(result.limit).toBe(100)
    expect(result.resetAt).toBeGreaterThan(Date.now())
  })

  it('decrements remaining on each call', () => {
    const ip = freshIP()
    checkGuestRateLimit(ip)
    const second = checkGuestRateLimit(ip)
    expect(second.remaining).toBe(98)
  })

  it('blocks the request after the daily limit is exhausted', () => {
    const ip = freshIP()
    for (let i = 0; i < 100; i++) checkGuestRateLimit(ip)
    const result = checkGuestRateLimit(ip)
    expect(result.allowed).toBe(false)
    expect(result.remaining).toBe(0)
  })

  it('keeps returning remaining=0 once blocked', () => {
    const ip = freshIP()
    for (let i = 0; i < 101; i++) checkGuestRateLimit(ip)
    expect(checkGuestRateLimit(ip).remaining).toBe(0)
    expect(checkGuestRateLimit(ip).allowed).toBe(false)
  })

  it('resets the count for a different IP', () => {
    const ip1 = freshIP()
    for (let i = 0; i < 100; i++) checkGuestRateLimit(ip1)
    // A different IP should still have full quota
    const result = checkGuestRateLimit(freshIP())
    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(99)
  })
})

describe('getGuestRateLimitStatus', () => {
  it('returns full quota for an unseen IP', () => {
    const status = getGuestRateLimitStatus(freshIP())
    expect(status.allowed).toBe(true)
    expect(status.remaining).toBe(100)
    expect(status.limit).toBe(100)
  })

  it('does not consume any quota', () => {
    const ip = freshIP()
    getGuestRateLimitStatus(ip)
    getGuestRateLimitStatus(ip)
    expect(getGuestRateLimitStatus(ip).remaining).toBe(100)
  })

  it('reflects requests already consumed by checkGuestRateLimit', () => {
    const ip = freshIP()
    checkGuestRateLimit(ip)
    checkGuestRateLimit(ip)
    const status = getGuestRateLimitStatus(ip)
    expect(status.remaining).toBe(98)
    expect(status.allowed).toBe(true)
  })

  it('reports not-allowed after limit is exhausted', () => {
    const ip = freshIP()
    for (let i = 0; i < 100; i++) checkGuestRateLimit(ip)
    const status = getGuestRateLimitStatus(ip)
    expect(status.allowed).toBe(false)
    expect(status.remaining).toBe(0)
  })
})

describe('checkTTSRateLimit', () => {
  it('allows a fresh key with full TTS quota', () => {
    const result = checkTTSRateLimit(freshTTSKey())
    expect(result.allowed).toBe(true)
    expect(result.limit).toBe(50)
    expect(result.remaining).toBe(49)
  })

  it('decrements remaining on each TTS call', () => {
    const key = freshTTSKey()
    checkTTSRateLimit(key)
    const second = checkTTSRateLimit(key)
    expect(second.remaining).toBe(48)
  })

  it('blocks after the TTS daily limit is exhausted', () => {
    const key = freshTTSKey()
    for (let i = 0; i < 50; i++) checkTTSRateLimit(key)
    const result = checkTTSRateLimit(key)
    expect(result.allowed).toBe(false)
    expect(result.remaining).toBe(0)
  })

  it('tracks TTS keys independently from guest IP keys', () => {
    const ip = freshIP()
    const tts = freshTTSKey()
    for (let i = 0; i < 100; i++) checkGuestRateLimit(ip)
    // Exhausting the guest limit should not affect TTS for a different key
    expect(checkTTSRateLimit(tts).allowed).toBe(true)
  })
})

describe('getTrackedIPCount', () => {
  it('returns a non-negative integer', () => {
    const count = getTrackedIPCount()
    expect(count).toBeGreaterThanOrEqual(0)
    expect(Number.isInteger(count)).toBe(true)
  })

  it('increases after a new IP makes a request', () => {
    const before = getTrackedIPCount()
    checkGuestRateLimit(freshIP())
    expect(getTrackedIPCount()).toBeGreaterThan(before)
  })
})
