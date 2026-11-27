/**
 * @fileoverview Tests for the card-text suggestion validation and spam helpers.
 */
import { describe, it, expect } from 'vitest'
import {
  CARD_TEXT_MAX_LENGTH,
  CARD_TEXT_MIN_LENGTH,
  clientIp,
  hashIp,
  isSubmissionStatus,
  parseCardTextSubmission,
  sqliteTimestamp,
} from '../card-text-submission'

const TEXT = 'Counterplans that fiat uniform action distort the literature base and the debate.'
const valid = { document: 'https://example.org/paper', reference: 'ref-3', text: TEXT }

describe('parseCardTextSubmission', () => {
  it('accepts a complete suggestion and trims it', () => {
    const parsed = parseCardTextSubmission({
      ...valid,
      text: `  ${TEXT}  `,
      documentTitle: ' A  Paper ',
      referenceLabel: "Galloway '20",
    })
    expect(parsed).toEqual({
      ok: true,
      value: {
        documentKey: 'https://example.org/paper',
        documentTitle: 'A Paper',
        referenceKey: 'ref-3',
        referenceLabel: "Galloway '20",
        text: TEXT,
      },
    })
  })

  it('keeps the paragraph breaks of the text', () => {
    const text = `${TEXT}\r\n\r\n${TEXT}`
    const parsed = parseCardTextSubmission({ ...valid, text })
    expect(parsed).toMatchObject({ ok: true, value: { text: `${TEXT}\n\n${TEXT}` } })
  })

  it('treats a filled honeypot as accepted-but-discarded', () => {
    expect(parseCardTextSubmission({ ...valid, website: 'http://spam.example' })).toEqual({
      ok: true,
      honeypot: true,
    })
  })

  it.each([null, undefined, 'text', 42, []])('rejects a non-object body (%s)', (body) => {
    expect(parseCardTextSubmission(body)).toMatchObject({ ok: false })
  })

  it('requires a document', () => {
    expect(parseCardTextSubmission({ ...valid, document: '  ' })).toEqual({
      ok: false,
      error: 'Missing document.',
    })
  })

  it.each(['', 'ref-', 'ref-x', 'ref-12345', '../etc', 'ref-1; DROP'])(
    'rejects reference key %j',
    (reference) => {
      expect(parseCardTextSubmission({ ...valid, reference })).toEqual({
        ok: false,
        error: 'Unknown reference.',
      })
    },
  )

  it('rejects empty text', () => {
    expect(parseCardTextSubmission({ ...valid, text: '   ' })).toMatchObject({
      ok: false,
      error: expect.stringContaining('paste the full text'),
    })
    expect(parseCardTextSubmission({ ...valid, text: undefined })).toMatchObject({ ok: false })
  })

  it('enforces the minimum length', () => {
    const short = 'x'.repeat(CARD_TEXT_MIN_LENGTH - 1)
    expect(parseCardTextSubmission({ ...valid, text: short })).toMatchObject({ ok: false })
    const edge = 'x'.repeat(CARD_TEXT_MIN_LENGTH)
    expect(parseCardTextSubmission({ ...valid, text: edge })).toMatchObject({ ok: true })
  })

  it('enforces the maximum length', () => {
    const over = 'x'.repeat(CARD_TEXT_MAX_LENGTH + 1)
    expect(parseCardTextSubmission({ ...valid, text: over })).toMatchObject({ ok: false })
    const edge = 'x'.repeat(CARD_TEXT_MAX_LENGTH)
    expect(parseCardTextSubmission({ ...valid, text: edge })).toMatchObject({ ok: true })
  })

  it('strips control characters and caps label lengths', () => {
    const parsed = parseCardTextSubmission({
      ...valid,
      text: `${TEXT}\u0000\u0007`,
      documentTitle: 'T'.repeat(1000),
    })
    expect(parsed).toMatchObject({ ok: true })
    if (parsed.ok && 'value' in parsed) {
      expect(parsed.value.text).toBe(TEXT)
      expect(parsed.value.documentTitle).toHaveLength(300)
    }
  })
})

describe('clientIp', () => {
  it('prefers the Cloudflare header, then proxies', () => {
    expect(clientIp(new Headers({ 'cf-connecting-ip': '1.1.1.1', 'x-forwarded-for': '2.2.2.2' }))).toBe('1.1.1.1')
    expect(clientIp(new Headers({ 'x-forwarded-for': '2.2.2.2, 3.3.3.3' }))).toBe('2.2.2.2')
    expect(clientIp(new Headers())).toBe('unknown')
    expect(clientIp(undefined)).toBe('unknown')
  })
})

describe('hashIp', () => {
  it('is a stable salted SHA-256 that hides the address', async () => {
    const a = await hashIp('1.2.3.4', 'salt')
    expect(a).toMatch(/^[0-9a-f]{64}$/)
    expect(a).not.toContain('1.2.3.4')
    expect(await hashIp('1.2.3.4', 'salt')).toBe(a)
    expect(await hashIp('1.2.3.4', 'other')).not.toBe(a)
    expect(await hashIp('1.2.3.5', 'salt')).not.toBe(a)
  })
})

describe('sqliteTimestamp', () => {
  it('formats like CURRENT_TIMESTAMP', () => {
    expect(sqliteTimestamp(Date.UTC(2026, 10, 27, 4, 20, 5))).toBe('2026-11-27 04:20:05')
  })
})

describe('isSubmissionStatus', () => {
  it('knows the three review states', () => {
    expect(isSubmissionStatus('pending')).toBe(true)
    expect(isSubmissionStatus('approved')).toBe(true)
    expect(isSubmissionStatus('rejected')).toBe(true)
    expect(isSubmissionStatus('spam')).toBe(false)
    expect(isSubmissionStatus(undefined)).toBe(false)
  })
})
