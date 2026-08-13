import { describe, expect, it } from 'vitest'
import {
  APP_NAME,
  APP_EMAIL,
  MAX_ARTICLE_LENGTH,
  DEFAULT_SUMMARIZE_PROMPT,
  listFooterLinks,
  SubscriptionPlans,
  SearchCategories,
} from '../site'

describe('scalar constants', () => {
  it('APP_NAME is a non-empty string', () => {
    expect(typeof APP_NAME).toBe('string')
    expect(APP_NAME.length).toBeGreaterThan(0)
  })

  it('APP_EMAIL contains an @ sign', () => {
    expect(APP_EMAIL).toMatch(/@/)
  })

  it('MAX_ARTICLE_LENGTH is a positive integer', () => {
    expect(Number.isInteger(MAX_ARTICLE_LENGTH)).toBe(true)
    expect(MAX_ARTICLE_LENGTH).toBeGreaterThan(0)
  })

  it('DEFAULT_SUMMARIZE_PROMPT is a non-empty string', () => {
    expect(typeof DEFAULT_SUMMARIZE_PROMPT).toBe('string')
    expect(DEFAULT_SUMMARIZE_PROMPT.length).toBeGreaterThan(0)
  })
})

describe('listFooterLinks', () => {
  it('is a non-empty array', () => {
    expect(Array.isArray(listFooterLinks)).toBe(true)
    expect(listFooterLinks.length).toBeGreaterThan(0)
  })

  it('every link has a non-empty url and text', () => {
    for (const link of listFooterLinks) {
      expect(typeof link.url).toBe('string')
      expect(link.url.length).toBeGreaterThan(0)
      expect(typeof link.text).toBe('string')
      expect(link.text.length).toBeGreaterThan(0)
    }
  })
})

describe('SubscriptionPlans', () => {
  it('contains at least one plan', () => {
    expect(SubscriptionPlans.length).toBeGreaterThan(0)
  })

  it('every plan has the required fields', () => {
    for (const plan of SubscriptionPlans) {
      expect(typeof plan.name).toBe('string')
      expect(typeof plan.price).toBe('number')
      expect(typeof plan.url).toBe('string')
      expect(Array.isArray(plan.features)).toBe(true)
    }
  })

  it('every feature has text and icon', () => {
    for (const plan of SubscriptionPlans) {
      for (const feature of plan.features) {
        expect(typeof feature.text).toBe('string')
        expect(typeof feature.icon).toBe('string')
      }
    }
  })

  it('has Free, Pro, and Team plans', () => {
    const names = SubscriptionPlans.map((p) => p.name)
    expect(names).toContain('Free')
    expect(names).toContain('Pro')
    expect(names).toContain('Team')
  })

  it('Free plan has price 0', () => {
    const free = SubscriptionPlans.find((p) => p.name === 'Free')
    expect(free?.price).toBe(0)
  })
})

describe('SearchCategories', () => {
  it('contains at least one category', () => {
    expect(SearchCategories.length).toBeGreaterThan(0)
  })

  it('every category has code, icon, and name', () => {
    for (const cat of SearchCategories) {
      expect(typeof cat.code).toBe('string')
      expect(cat.code.length).toBeGreaterThan(0)
      expect(typeof cat.icon).toBe('string')
      expect(typeof cat.name).toBe('string')
    }
  })

  it('includes a "general" category', () => {
    expect(SearchCategories.some((c) => c.code === 'general')).toBe(true)
  })

  it('category codes are unique', () => {
    const codes = SearchCategories.map((c) => c.code)
    expect(new Set(codes).size).toBe(codes.length)
  })
})
