/**
 * @fileoverview Unit tests for the better-auth Stripe plugin setup and the
 * Payment Link checkout linking done from its webhook.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type Stripe from 'stripe'

const db = {
  selectResults: [] as unknown[][],
  updates: [] as unknown[],
  inserts: [] as unknown[],
  select: vi.fn(() => ({
    from: () => ({ where: async () => db.selectResults.shift() ?? [] }),
  })),
  update: vi.fn(() => ({
    set: (values: unknown) => ({
      where: async () => {
        db.updates.push(values)
      },
    }),
  })),
  insert: vi.fn(() => ({
    values: async (values: unknown) => {
      db.inserts.push(values)
    },
  })),
}

vi.mock('../../database', () => ({
  getQueryDB: () => db,
}))

import {
  createStripePlugin,
  getStripePlans,
  linkPaymentLinkCheckout,
  resolvePlanName,
} from '../stripe'

const stripeSubscription = {
  id: 'sub_1',
  status: 'trialing',
  trial_start: 1_700_000_000,
  trial_end: 1_700_604_800,
  cancel_at_period_end: false,
  cancel_at: null,
  canceled_at: null,
  ended_at: null,
  items: {
    data: [
      {
        quantity: 1,
        current_period_start: 1_700_000_000,
        current_period_end: 1_702_592_000,
        price: { id: 'price_team', unit_amount: 9900, recurring: { interval: 'month' } },
      },
    ],
  },
}

function makeClient() {
  return {
    subscriptions: { retrieve: vi.fn().mockResolvedValue(stripeSubscription) },
  } as unknown as Stripe & { subscriptions: { retrieve: ReturnType<typeof vi.fn> } }
}

function checkoutSession(overrides: Partial<Stripe.Checkout.Session> = {}) {
  return {
    id: 'cs_1',
    mode: 'subscription',
    client_reference_id: 'user_1',
    customer: 'cus_1',
    subscription: 'sub_1',
    metadata: {},
    ...overrides,
  } as Stripe.Checkout.Session
}

beforeEach(() => {
  db.selectResults = []
  db.updates = []
  db.inserts = []
})

describe('getStripePlans', () => {
  it('builds one plugin plan per paid site plan with a 7-day trial', () => {
    expect(getStripePlans({ STRIPE_PRICE_ID_PRO: 'price_pro' })).toEqual([
      { name: 'pro', priceId: 'price_pro', freeTrial: { days: 7 } },
      { name: 'team', priceId: undefined, freeTrial: { days: 7 } },
    ])
  })
})

describe('resolvePlanName', () => {
  it('prefers a configured price ID', () => {
    expect(
      resolvePlanName({ id: 'price_x', unit_amount: 500 }, { STRIPE_PRICE_ID_TEAM: 'price_x' }),
    ).toBe('team')
  })

  it('falls back to the monthly amount', () => {
    expect(resolvePlanName({ id: 'price_y', unit_amount: 500 }, {})).toBe('pro')
    expect(resolvePlanName({ id: 'price_z', unit_amount: 123 }, {})).toBeUndefined()
  })
})

describe('createStripePlugin', () => {
  it('is disabled without both Stripe secrets', () => {
    expect(createStripePlugin({})).toBeNull()
    expect(createStripePlugin({ STRIPE_SECRET_KEY: 'sk_test_1' })).toBeNull()
  })

  it('returns the better-auth stripe plugin when configured', () => {
    const plugin = createStripePlugin({
      STRIPE_SECRET_KEY: 'sk_test_1',
      STRIPE_WEBHOOK_SECRET: 'whsec_1',
    })
    expect(plugin?.id).toBe('stripe')
  })
})

describe('linkPaymentLinkCheckout', () => {
  it('links the customer to the user and records the subscription', async () => {
    db.selectResults = [[{ id: 'user_1', stripeCustomerId: null }], []]
    const client = makeClient()

    await linkPaymentLinkCheckout(client, checkoutSession())

    expect(client.subscriptions.retrieve).toHaveBeenCalledWith('sub_1')
    expect(db.updates).toEqual([{ stripeCustomerId: 'cus_1' }])
    expect(db.inserts).toHaveLength(1)
    expect(db.inserts[0]).toMatchObject({
      plan: 'team',
      referenceId: 'user_1',
      stripeCustomerId: 'cus_1',
      stripeSubscriptionId: 'sub_1',
      status: 'trialing',
      trialEnd: new Date(1_700_604_800 * 1000),
      billingInterval: 'month',
      seats: 1,
    })
  })

  it('does not duplicate a subscription already on record', async () => {
    db.selectResults = [[{ id: 'user_1', stripeCustomerId: 'cus_1' }], [{ id: 'existing' }]]
    const client = makeClient()

    await linkPaymentLinkCheckout(client, checkoutSession())

    expect(db.updates).toEqual([])
    expect(db.inserts).toEqual([])
    expect(client.subscriptions.retrieve).not.toHaveBeenCalled()
  })

  it('ignores checkouts the plugin created, unknown users and non-subscriptions', async () => {
    const client = makeClient()

    await linkPaymentLinkCheckout(client, checkoutSession({ metadata: { subscriptionId: 's' } }))
    await linkPaymentLinkCheckout(client, checkoutSession({ mode: 'payment' }))
    await linkPaymentLinkCheckout(client, checkoutSession({ client_reference_id: null }))
    db.selectResults = [[]]
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    await linkPaymentLinkCheckout(client, checkoutSession())

    expect(db.updates).toEqual([])
    expect(db.inserts).toEqual([])
    expect(client.subscriptions.retrieve).not.toHaveBeenCalled()
  })
})
