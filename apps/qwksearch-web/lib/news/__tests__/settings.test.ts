/**
 * @fileoverview The site-wide news-widget settings: how a stored row and an
 * admin's request body are normalised, and how the widget's topic list is
 * resolved from the settings plus what the visitor asked for.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/database', () => ({ getDB: vi.fn() }))

import { getDB } from '@/lib/database'
import { createFakeDb, type FakeDb } from '../../../app/api/__tests__/helpers/fake-db'
import {
  DEFAULT_NEWS_WIDGET_SETTINGS,
  getNewsWidgetSettings,
  normalizeNewsWidgetSettings,
  resolveTopics,
  saveNewsWidgetSettings,
} from '../settings'

const mockGetDB = getDB as unknown as ReturnType<typeof vi.fn>

function fakeDb(options: Parameters<typeof createFakeDb>[0] = {}): FakeDb {
  const db = createFakeDb(options)
  mockGetDB.mockReturnValue(db)
  return db
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('normalizeNewsWidgetSettings', () => {
  it('clamps numbers into the range the widget can serve', () => {
    const settings = normalizeNewsWidgetSettings({
      maxTopics: 500,
      cacheMinutes: 0,
      retentionDays: -5,
    })

    expect(settings.maxTopics).toBe(20)
    // A zero-minute cache would spend the day's News API quota in an hour.
    expect(settings.cacheMinutes).toBe(1)
    expect(settings.retentionDays).toBe(1)
  })

  it('keeps the current value for a field the body does not name', () => {
    const current = { ...DEFAULT_NEWS_WIDGET_SETTINGS, maxTopics: 12, enabled: false }

    const settings = normalizeNewsWidgetSettings({ showImages: false }, current)

    expect(settings.maxTopics).toBe(12)
    expect(settings.enabled).toBe(false)
    expect(settings.showImages).toBe(false)
  })

  it('accepts the string booleans an HTML form sends', () => {
    expect(normalizeNewsWidgetSettings({ enabled: 'false' }).enabled).toBe(false)
    expect(normalizeNewsWidgetSettings({ enabled: 'true' }).enabled).toBe(true)
    expect(normalizeNewsWidgetSettings({ enabled: 0 }).enabled).toBe(false)
  })

  it('canonicalises the topic list, so the field shows what was saved', () => {
    const settings = normalizeNewsWidgetSettings({
      defaultTopics: ' fusion power ,\n\n shipping , Fusion Power ',
    })

    expect(settings.defaultTopics).toBe('fusion power, shipping')
  })

  it('falls back rather than storing a number it cannot parse', () => {
    expect(normalizeNewsWidgetSettings({ maxTopics: 'lots' }).maxTopics).toBe(
      DEFAULT_NEWS_WIDGET_SETTINGS.maxTopics,
    )
  })
})

describe('getNewsWidgetSettings', () => {
  it('returns the stored row', async () => {
    fakeDb({ select: [{ ...DEFAULT_NEWS_WIDGET_SETTINGS, enabled: false, maxTopics: 9 }] })

    const settings = await getNewsWidgetSettings()

    expect(settings.enabled).toBe(false)
    expect(settings.maxTopics).toBe(9)
  })

  it('returns the defaults when nothing has been saved yet', async () => {
    fakeDb({ select: [] })

    expect(await getNewsWidgetSettings()).toEqual(DEFAULT_NEWS_WIDGET_SETTINGS)
  })

  it('returns the defaults rather than throwing when the database is down', async () => {
    mockGetDB.mockImplementation(() => {
      throw new Error('Database unavailable')
    })

    // The widget is decoration on a page whose job is search: an unreachable
    // database must cost the news card, not the homepage.
    expect(await getNewsWidgetSettings()).toEqual(DEFAULT_NEWS_WIDGET_SETTINGS)
  })
})

describe('saveNewsWidgetSettings', () => {
  it('merges the patch over what is stored and writes one row', async () => {
    const db = fakeDb({ select: [{ ...DEFAULT_NEWS_WIDGET_SETTINGS, maxTopics: 9 }] })

    const saved = await saveNewsWidgetSettings({ enabled: false }, 'admin@example.com')

    expect(saved.enabled).toBe(false)
    expect(saved.maxTopics).toBe(9)
    expect(db.calls.values?.[0]?.[0]).toMatchObject({
      id: 'global',
      enabled: false,
      maxTopics: 9,
      updatedBy: 'admin@example.com',
    })
    expect(db.calls.onConflictDoUpdate).toHaveLength(1)
  })

  it('reports a failed write, unlike a failed read', async () => {
    mockGetDB.mockImplementation(() => {
      throw new Error('Database unavailable')
    })

    // An admin has to know their change did not take.
    await expect(saveNewsWidgetSettings({ enabled: false })).rejects.toThrow()
  })
})

describe('resolveTopics', () => {
  const settings = { ...DEFAULT_NEWS_WIDGET_SETTINGS, defaultTopics: 'fusion, shipping' }

  it('prefers the visitor’s topics', () => {
    expect(resolveTopics(settings, 'baseball, opera')).toEqual(['baseball', 'opera'])
  })

  it('falls back to the site defaults when the visitor named none', () => {
    expect(resolveTopics(settings, null)).toEqual(['fusion', 'shipping'])
    expect(resolveTopics(settings, '   ')).toEqual(['fusion', 'shipping'])
  })

  it('ignores the visitor’s topics when the site does not allow them', () => {
    expect(resolveTopics({ ...settings, allowUserTopics: false }, 'baseball')).toEqual([
      'fusion',
      'shipping',
    ])
  })

  it('returns nothing when neither side named a topic, meaning "use trending"', () => {
    expect(resolveTopics({ ...DEFAULT_NEWS_WIDGET_SETTINGS }, null)).toEqual([])
  })
})
