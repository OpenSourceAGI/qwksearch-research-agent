/**
 * @fileoverview Route tests for the search-engine registry endpoint, which
 * groups the engine list by category and attaches favicon domains.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('search-web-api/search/search-engines-registry-list', () => ({
  ALL_ENGINES: [
    { name: 'google', categories: ['general'] },
    { name: 'brave', categories: ['general', 'news'] },
    { name: 'unknown_engine', categories: ['general'] },
    { name: 'niche', categories: ['uncategorised'] },
  ],
  engineDescriptions: { google: 'The big one' },
}))

vi.mock('search-web-api/registry/search-engine-category-registry.js', () => ({
  CATEGORIES: { general: {}, news: {}, images: {} },
}))

import { GET } from '../route'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/search/engines', () => {
  it('groups engines under each of their categories', async () => {
    const { engines } = await (await GET()).json()

    expect(engines.general.map((e: any) => e.name)).toEqual([
      'google',
      'brave',
      'unknown_engine',
    ])
    expect(engines.news.map((e: any) => e.name)).toEqual(['brave'])
  })

  it('includes every known category, even the empty ones', async () => {
    const { engines } = await (await GET()).json()

    expect(Object.keys(engines)).toEqual(
      expect.arrayContaining(['general', 'news', 'images', 'uncategorised']),
    )
    expect(engines.images).toEqual([])
  })

  it('creates a bucket for a category not in the registry', async () => {
    const { engines } = await (await GET()).json()

    expect(engines.uncategorised.map((e: any) => e.name)).toEqual(['niche'])
  })

  it('attaches a favicon domain when one is known', async () => {
    const { engines } = await (await GET()).json()

    expect(engines.general.find((e: any) => e.name === 'google').domain).toBe('google.com')
    expect(engines.general.find((e: any) => e.name === 'brave').domain).toBe('search.brave.com')
  })

  it('nulls the domain for an engine with no mapping', async () => {
    const { engines } = await (await GET()).json()

    expect(engines.general.find((e: any) => e.name === 'unknown_engine').domain).toBeNull()
  })

  it('attaches a description when one exists and nulls it otherwise', async () => {
    const { engines } = await (await GET()).json()

    expect(engines.general.find((e: any) => e.name === 'google').description).toBe('The big one')
    expect(engines.general.find((e: any) => e.name === 'brave').description).toBeNull()
  })

  it('carries the full category list on each entry', async () => {
    const { engines } = await (await GET()).json()

    expect(engines.news[0].categories).toEqual(['general', 'news'])
  })

  it('returns 200', async () => {
    expect((await GET()).status).toBe(200)
  })
})
