/**
 * @fileoverview Unit tests for the Stripe Payment Link upgrade helpers.
 */
import { describe, it, expect } from 'vitest'
import { buildUpgradeUrl, getPaidPlans, planForUnitAmount, planKey } from '../payment-links'
import { SubscriptionPlans } from '../../config/site'

describe('getPaidPlans', () => {
  it('returns only plans with a price and a checkout URL', () => {
    const names = getPaidPlans().map((p) => p.name)
    expect(names).toEqual(['Pro', 'Team'])
  })

  it('points the paid plans at the Stripe payment links', () => {
    const urls = getPaidPlans().map((p) => p.url)
    expect(urls).toEqual([
      'https://buy.stripe.com/8wMdTmdi1asl1xe3cc',
      'https://buy.stripe.com/bIY4iM3HrfMF4Jq28a',
    ])
  })
})

describe('planForUnitAmount', () => {
  it('maps the monthly amount in cents to its plan', () => {
    expect(planForUnitAmount(500)?.name).toBe('Pro')
    expect(planForUnitAmount(9900)?.name).toBe('Team')
  })

  it('returns undefined for unknown or missing amounts', () => {
    expect(planForUnitAmount(19900)).toBeUndefined()
    expect(planForUnitAmount(null)).toBeUndefined()
    expect(planForUnitAmount(0, SubscriptionPlans)).toBeUndefined()
  })
})

describe('planKey', () => {
  it('lowercases the plan name the way the Stripe plugin stores it', () => {
    expect(planKey({ name: 'Team' })).toBe('team')
  })
})

describe('buildUpgradeUrl', () => {
  const link = 'https://buy.stripe.com/8wMdTmdi1asl1xe3cc'

  it('attaches the user as client_reference_id and prefills the email', () => {
    const url = new URL(buildUpgradeUrl(link, { id: 'user_123-abc', email: 'a+b@example.com' }))
    expect(url.origin + url.pathname).toBe(link)
    expect(url.searchParams.get('client_reference_id')).toBe('user_123-abc')
    expect(url.searchParams.get('prefilled_email')).toBe('a+b@example.com')
  })

  it('omits a user ID Stripe would reject', () => {
    const url = new URL(buildUpgradeUrl(link, { id: 'has spaces!', email: null }))
    expect(url.searchParams.has('client_reference_id')).toBe(false)
    expect(url.searchParams.has('prefilled_email')).toBe(false)
  })

  it('returns the link unchanged without a user or for a non-URL', () => {
    expect(buildUpgradeUrl(link)).toBe(link)
    expect(buildUpgradeUrl('#', { id: 'u1' })).toBe('#')
  })
})
