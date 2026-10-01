/**
 * @fileoverview Tests for the embedder's `?footer=` switch over the homepage and
 * /features marketing close. The default has to stay "shown" so qwksearch.com's
 * own pages are unchanged; only an explicit choice hides it.
 */
import { describe, it, expect } from 'vitest'
import { parseSiteFooterValue, resolveSiteFooter } from '../site-footer'

describe('parseSiteFooterValue', () => {
  it('reads the hide values', () => {
    for (const value of ['0', 'false', 'off', 'no', 'hide', ' OFF ']) {
      expect(parseSiteFooterValue(value)).toBe(false)
    }
  })

  it('reads the show values', () => {
    for (const value of ['1', 'true', 'on', 'yes', 'show', 'True']) {
      expect(parseSiteFooterValue(value)).toBe(true)
    }
  })

  it('leaves missing or unknown values undecided', () => {
    expect(parseSiteFooterValue(null)).toBeUndefined()
    expect(parseSiteFooterValue(undefined)).toBeUndefined()
    expect(parseSiteFooterValue('')).toBeUndefined()
    expect(parseSiteFooterValue('maybe')).toBeUndefined()
  })
})

describe('resolveSiteFooter', () => {
  it('shows the footer by default', () => {
    expect(resolveSiteFooter({ search: '', stored: null })).toBe(true)
    expect(resolveSiteFooter({ search: '?q=cats', stored: null })).toBe(true)
  })

  it('hides it when the embedder asks on the URL', () => {
    expect(resolveSiteFooter({ search: '?footer=0', stored: null })).toBe(false)
    expect(resolveSiteFooter({ search: 'q=cats&footer=off', stored: null })).toBe(false)
  })

  it('keeps a remembered choice once the query string is gone', () => {
    expect(resolveSiteFooter({ search: '', stored: '0' })).toBe(false)
  })

  it('lets the URL override a remembered choice', () => {
    expect(resolveSiteFooter({ search: '?footer=1', stored: '0' })).toBe(true)
    expect(resolveSiteFooter({ search: '?footer=0', stored: '1' })).toBe(false)
  })

  it('ignores an unrecognised URL value in favour of the remembered one', () => {
    expect(resolveSiteFooter({ search: '?footer=maybe', stored: '0' })).toBe(false)
    expect(resolveSiteFooter({ search: '?footer=maybe', stored: null })).toBe(true)
  })
})
