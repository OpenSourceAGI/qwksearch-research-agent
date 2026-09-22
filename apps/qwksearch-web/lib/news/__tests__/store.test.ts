/**
 * @fileoverview The durable news archive: what a fetched payload flattens
 * into, and what the widget gets back when the upstream is unavailable.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// `getQueryDB` is the same handle under a type that keeps the query builder's
// inference (see `lib/database`), so both names resolve to one fake.
vi.mock('@/lib/database', () => {
  const getDB = vi.fn()
  return { getDB, getQueryDB: getDB }
})

import { getDB } from '@/lib/database'
import { createFakeDb, type FakeDb } from '../../../app/api/__tests__/helpers/fake-db'
import {
  getNewsStoreStats,
  readStoredTrendingNews,
  storeTrendingNews,
} from '../store'

const mockGetDB = getDB as unknown as ReturnType<typeof vi.fn>

function fakeDb(options: Parameters<typeof createFakeDb>[0] = {}): FakeDb {
  const db = createFakeDb(options)
  mockGetDB.mockReturnValue(db)
  return db
}

function article(title: string, url = `https://example.com/${encodeURIComponent(title)}`) {
  return {
    title,
    url,
    source: 'example.com',
    published_at: '2024-01-01T09:00:00Z',
    image_url: 'https://example.com/a.jpg',
  }
}

function payload(topics: { topic: string; articles: ReturnType<typeof article>[] }[]) {
  return {
    source: 'wikipedia_daily_top',
    date: '2024-01-01',
    topics: topics.map((t, i) => ({
      topic: t.topic,
      wiki_rank: i + 1,
      wiki_views: 1000 - i,
      news_count: t.articles.length,
      articles: t.articles,
    })),
  }
}

/** A stored row as the archive holds it. */
function row(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    topic: 'Eclipse',
    topicSource: 'wikipedia_daily_top',
    title: 'Total eclipse crosses North America',
    url: 'https://example.com/a',
    source: 'example.com',
    imageUrl: null,
    publishedAt: '2024-01-01T09:00:00Z',
    wikiRank: 1,
    wikiViews: 1000,
    firstSeenAt: new Date('2024-01-01T10:00:00Z'),
    fetchedAt: new Date('2024-01-01T10:00:00Z'),
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('storeTrendingNews', () => {
  it('flattens every topic’s articles into rows', async () => {
    const db = fakeDb()

    const written = await storeTrendingNews(
      payload([
        { topic: 'Eclipse', articles: [article('One'), article('Two')] },
        { topic: 'Elections', articles: [article('Three')] },
      ]),
    )

    expect(written).toBe(3)
    const rows = db.calls.values[0][0] as any[]
    expect(rows).toHaveLength(3)
    expect(rows[0]).toMatchObject({
      topic: 'Eclipse',
      topicSource: 'wikipedia_daily_top',
      title: 'One',
      wikiRank: 1,
    })
  })

  it('updates on conflict, so a re-fetch does not duplicate an article', async () => {
    const db = fakeDb()

    await storeTrendingNews(payload([{ topic: 'Eclipse', articles: [article('One')] }]))

    expect(db.calls.onConflictDoUpdate).toHaveLength(1)
  })

  it('skips an article with no URL, which cannot be de-duplicated or linked', async () => {
    const db = fakeDb()

    const written = await storeTrendingNews(
      payload([
        {
          topic: 'Eclipse',
          articles: [article('One'), { ...article('Two'), url: undefined } as any],
        },
      ]),
    )

    expect(written).toBe(1)
    expect((db.calls.values[0][0] as any[])).toHaveLength(1)
  })

  it('writes nothing, and calls nothing, for an empty payload', async () => {
    const db = fakeDb()

    expect(await storeTrendingNews(payload([]))).toBe(0)
    expect(db.calls.insert).toBeUndefined()
  })

  it('swallows a store failure — the caller is on the response path', async () => {
    mockGetDB.mockImplementation(() => {
      throw new Error('Database unavailable')
    })

    expect(
      await storeTrendingNews(payload([{ topic: 'Eclipse', articles: [article('One')] }])),
    ).toBe(0)
  })
})

describe('readStoredTrendingNews', () => {
  it('rebuilds the wire shape, grouping rows back into topics', async () => {
    fakeDb({
      select: [
        row({ id: 1, topic: 'Eclipse', url: 'https://example.com/a', title: 'One' }),
        row({ id: 2, topic: 'Eclipse', url: 'https://example.com/b', title: 'Two' }),
        row({ id: 3, topic: 'Elections', url: 'https://example.com/c', wikiRank: 2 }),
      ],
    })

    const data = await readStoredTrendingNews({})

    expect(data?.topics.map((t) => [t.topic, t.news_count])).toEqual([
      ['Eclipse', 2],
      ['Elections', 1],
    ])
    expect(data?.topics[0].articles[0]).toEqual({
      title: 'One',
      url: 'https://example.com/a',
      source: 'example.com',
      published_at: '2024-01-01T09:00:00Z',
      image_url: undefined,
    })
  })

  it('keeps a custom list in the order the visitor wrote it', async () => {
    fakeDb({
      select: [
        row({ id: 1, topic: 'shipping', url: 'https://example.com/a', wikiRank: null }),
        row({ id: 2, topic: 'fusion', url: 'https://example.com/b', wikiRank: null }),
      ],
    })

    const data = await readStoredTrendingNews({ topics: ['fusion', 'shipping'] })

    expect(data?.topics.map((t) => t.topic)).toEqual(['fusion', 'shipping'])
  })

  it('orders the daily list by its Wikipedia rank', async () => {
    fakeDb({
      select: [
        row({ id: 1, topic: 'Second', url: 'https://example.com/a', wikiRank: 2 }),
        row({ id: 2, topic: 'First', url: 'https://example.com/b', wikiRank: 1 }),
      ],
    })

    const data = await readStoredTrendingNews({})

    expect(data?.topics.map((t) => t.topic)).toEqual(['First', 'Second'])
  })

  it('caps the daily list at the requested number of topics', async () => {
    fakeDb({
      select: [1, 2, 3, 4].map((i) =>
        row({ id: i, topic: `T${i}`, url: `https://example.com/${i}`, wikiRank: i }),
      ),
    })

    const data = await readStoredTrendingNews({ limit: 2 })

    expect(data?.topics.map((t) => t.topic)).toEqual(['T1', 'T2'])
  })

  it('returns null when the archive has nothing recent enough', async () => {
    fakeDb({ select: [] })

    expect(await readStoredTrendingNews({})).toBeNull()
  })

  it('returns null rather than throwing when the database is down', async () => {
    mockGetDB.mockImplementation(() => {
      throw new Error('Database unavailable')
    })

    expect(await readStoredTrendingNews({})).toBeNull()
  })
})

describe('getNewsStoreStats', () => {
  it('reports totals and per-topic counts as ISO timestamps', async () => {
    const seconds = Math.floor(Date.parse('2024-01-01T10:00:00Z') / 1000)
    fakeDb({
      select: (call) =>
        call === 0
          ? [{ topic: 'Eclipse', articleCount: 2, lastFetchedAt: seconds }]
          : [{ articleCount: 3, topicCount: 2, lastFetchedAt: seconds }],
    })

    const stats = await getNewsStoreStats()

    expect(stats.articleCount).toBe(3)
    expect(stats.topicCount).toBe(2)
    expect(stats.lastFetchedAt).toBe('2024-01-01T10:00:00.000Z')
    expect(stats.topTopics).toEqual([
      { topic: 'Eclipse', articleCount: 2, lastFetchedAt: '2024-01-01T10:00:00.000Z' },
    ])
  })

  it('reports an empty archive when the database is down', async () => {
    mockGetDB.mockImplementation(() => {
      throw new Error('Database unavailable')
    })

    expect(await getNewsStoreStats()).toEqual({
      articleCount: 0,
      topicCount: 0,
      lastFetchedAt: null,
      topTopics: [],
    })
  })
})
