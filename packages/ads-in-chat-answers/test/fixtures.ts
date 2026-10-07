import type { Campaign } from '../src/types';

export function campaign(overrides: Partial<Campaign> = {}): Campaign {
  return {
    id: 'books',
    advertiser: 'PageTurner Books',
    description: 'Cheap used books on logo design and branding',
    keywords: ['logo design', 'branding books', 'graphic design'],
    negativeKeywords: ['free download'],
    placements: ['answer', 'follow-up'],
    products: [{ id: 'p1', title: 'Logo Design Love', price: '$6.49', url: 'https://example.com/p1' }],
    followUp: { topic: 'logo design books', url: 'https://example.com' },
    maxCpcCents: 40,
    dailyBudgetCents: 1000,
    spentTodayCents: 0,
    active: true,
    ...overrides,
  };
}
