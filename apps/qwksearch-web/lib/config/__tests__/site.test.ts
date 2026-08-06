import { describe, expect, it } from 'vitest'
import {
  config,
  listFooterLinks,
  SubscriptionPlans,
  SearchCategories,
} from '../site'

describe('scalar constants', () => {
  it('appName is a non-empty string', () => {
    expect(typeof config.appName).toBe('string')
    expect(config.appName.length).toBeGreaterThan(0)
  })

  it('appEmail contains an @ sign', () => {
    expect(config.appEmail).toMatch(/@/)
  })

  it('maxArticleLength is a positive integer', () => {
    expect(Number.isInteger(config.maxArticleLength)).toBe(true)
    expect(config.maxArticleLength).toBeGreaterThan(0)
  })

  it('defaultSummarizePrompt is a non-empty string', () => {
    expect(typeof config.defaultSummarizePrompt).toBe('string')
    expect(config.defaultSummarizePrompt.length).toBeGreaterThan(0)
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
