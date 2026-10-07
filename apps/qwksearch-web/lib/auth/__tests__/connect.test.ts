/**
 * @fileoverview Tests for the "Sign in with QwkSearch" connect flow helpers:
 * redirect allowlisting, signed codes, and PKCE redemption.
 */
import { describe, it, expect } from 'vitest'
import {
  CONNECT_CODE_TTL_SECONDS,
  connectAllowedOrigins,
  isValidPkceValue,
  pkceChallenge,
  redeemConnectCode,
  resolveConnectClient,
  signConnectCode,
  verifyConnectCode,
  withQuery,
} from '../connect'

const SECRET = 'test-secret'
const VERIFIER = 'a'.repeat(43) + '-._~b'
const REDIRECT = 'https://debate-ai.com/api/qwksearch/callback'

describe('resolveConnectClient', () => {
  it('accepts debate-ai.com and its subdomains, named "Debate AI"', () => {
    expect(resolveConnectClient(REDIRECT)).toEqual({ origin: 'https://debate-ai.com', name: 'Debate AI' })
    expect(resolveConnectClient('https://beta.debate-ai.com/cb')?.name).toBe('Debate AI')
    expect(resolveConnectClient('https://ebate.app/api/qwksearch/callback')?.name).toBe('Debate AI')
  })

  it('accepts localhost on any port over http', () => {
    expect(resolveConnectClient('http://localhost:3000/cb')?.origin).toBe('http://localhost:3000')
  })

  it('rejects unknown, look-alike, non-https and malformed URIs', () => {
    for (const uri of [
      'https://evil.com/cb',
      'https://debate-ai.com.evil.com/cb',
      'https://evildebate-ai.com/cb',
      'http://debate-ai.com/cb',
      'javascript:alert(1)',
      'https://user:pw@debate-ai.com/cb',
      'not a url',
      '',
      null,
    ]) {
      expect(resolveConnectClient(uri as string)).toBeNull()
    }
  })

  it('adds origins from QWKSEARCH_CONNECT_ORIGINS', () => {
    const allowed = connectAllowedOrigins('https://partner.example/, https://*.other.example')
    expect(resolveConnectClient('https://partner.example/cb', allowed)?.name).toBe('partner.example')
    expect(resolveConnectClient('https://a.other.example/cb', allowed)).not.toBeNull()
  })
})

describe('withQuery', () => {
  it('keeps existing parameters and skips empty values', () => {
    expect(withQuery('https://x.test/cb?a=1', { code: 'c', state: '' })).toBe('https://x.test/cb?a=1&code=c')
  })
})

describe('isValidPkceValue', () => {
  it('enforces RFC 7636 length and charset', () => {
    expect(isValidPkceValue(VERIFIER)).toBe(true)
    expect(isValidPkceValue('short')).toBe(false)
    expect(isValidPkceValue('a'.repeat(129))).toBe(false)
    expect(isValidPkceValue('a'.repeat(42) + '!')).toBe(false)
  })
})

describe('connect codes', () => {
  it('round-trips a signed code', async () => {
    const challenge = await pkceChallenge(VERIFIER)
    const code = await signConnectCode({ uid: 'u1', redirectUri: REDIRECT, challenge }, SECRET, 1_000_000)
    const payload = await verifyConnectCode(code, SECRET, 1_000_000)
    expect(payload).toMatchObject({ uid: 'u1', redirectUri: REDIRECT, challenge })
  })

  it('rejects a code signed with another secret, tampered, or expired', async () => {
    const code = await signConnectCode({ uid: 'u1', redirectUri: REDIRECT, challenge: 'x' }, SECRET, 0)
    expect(await verifyConnectCode(code, 'other', 0)).toBeNull()
    const [body, sig] = code.split('.')
    const forged = btoa(JSON.stringify({ uid: 'admin', redirectUri: REDIRECT, challenge: 'x', exp: 9e9 }))
      .replace(/=+$/, '')
    expect(await verifyConnectCode(`${forged}.${sig}`, SECRET, 0)).toBeNull()
    expect(await verifyConnectCode(`${body}.${sig}.extra`, SECRET, 0)).toBeNull()
    expect(await verifyConnectCode(code, SECRET, (CONNECT_CODE_TTL_SECONDS + 1) * 1000)).toBeNull()
  })

  it('redeems only with the matching redirect URI and PKCE verifier', async () => {
    const challenge = await pkceChallenge(VERIFIER)
    const code = await signConnectCode({ uid: 'u1', redirectUri: REDIRECT, challenge }, SECRET)

    expect(await redeemConnectCode({ code, redirectUri: REDIRECT, codeVerifier: VERIFIER }, SECRET)).toEqual({
      ok: true,
      uid: 'u1',
    })
    expect(
      await redeemConnectCode({ code, redirectUri: 'https://debate-ai.com/other', codeVerifier: VERIFIER }, SECRET),
    ).toEqual({ ok: false, error: 'invalid_grant' })
    expect(
      await redeemConnectCode({ code, redirectUri: REDIRECT, codeVerifier: 'b'.repeat(43) }, SECRET),
    ).toEqual({ ok: false, error: 'invalid_grant' })
    expect(await redeemConnectCode({ code, redirectUri: REDIRECT }, SECRET)).toEqual({
      ok: false,
      error: 'invalid_request',
    })
  })
})
