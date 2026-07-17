import { describe, expect, it } from 'vitest'
import { cn, formatTimeDifference, formatChatHistoryAsString, computeSimilarity } from '../index'

describe('cn', () => {
  it('combines class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar')
  })

  it('deduplicates conflicting tailwind utilities (last wins)', () => {
    expect(cn('p-4', 'p-8')).toBe('p-8')
  })

  it('ignores falsy values', () => {
    expect(cn('base', false && 'ignored', undefined, 'kept')).toBe('base kept')
  })

  it('handles conditional object syntax', () => {
    expect(cn({ active: true, disabled: false })).toBe('active')
  })
})

describe('formatTimeDifference', () => {
  const base = new Date('2024-01-01T00:00:00Z')

  it('returns singular second', () => {
    const d2 = new Date(base.getTime() + 1_000)
    expect(formatTimeDifference(base, d2)).toBe('1 second')
  })

  it('returns plural seconds', () => {
    const d2 = new Date(base.getTime() + 30_000)
    expect(formatTimeDifference(base, d2)).toBe('30 seconds')
  })

  it('returns singular minute', () => {
    const d2 = new Date(base.getTime() + 60_000)
    expect(formatTimeDifference(base, d2)).toBe('1 minute')
  })

  it('returns plural minutes', () => {
    const d2 = new Date(base.getTime() + 120_000)
    expect(formatTimeDifference(base, d2)).toBe('2 minutes')
  })

  it('returns hours', () => {
    const d2 = new Date(base.getTime() + 7_200_000)
    expect(formatTimeDifference(base, d2)).toBe('2 hours')
  })

  it('returns days', () => {
    const d2 = new Date(base.getTime() + 172_800_000)
    expect(formatTimeDifference(base, d2)).toBe('2 days')
  })

  it('returns years', () => {
    const d2 = new Date(base.getTime() + 63_072_000_000)
    expect(formatTimeDifference(base, d2)).toBe('2 years')
  })

  it('is symmetric (uses absolute difference)', () => {
    const d2 = new Date(base.getTime() + 5_000)
    expect(formatTimeDifference(d2, base)).toBe(formatTimeDifference(base, d2))
  })

  it('accepts ISO string dates', () => {
    expect(
      formatTimeDifference('2024-01-01T00:00:00Z', '2024-01-01T00:00:30Z'),
    ).toBe('30 seconds')
  })
})

describe('formatChatHistoryAsString', () => {
  it('labels assistant role as AI', () => {
    expect(
      formatChatHistoryAsString([{ role: 'assistant', content: 'Hello' }]),
    ).toBe('AI: Hello')
  })

  it('labels type=ai as AI', () => {
    expect(
      formatChatHistoryAsString([{ type: 'ai', content: 'Response' }]),
    ).toBe('AI: Response')
  })

  it('labels other roles as User', () => {
    expect(
      formatChatHistoryAsString([{ role: 'human', content: 'Question' }]),
    ).toBe('User: Question')
  })

  it('coerces undefined content to empty string', () => {
    expect(
      formatChatHistoryAsString([{ role: 'human', content: undefined }]),
    ).toBe('User: ')
  })

  it('joins multiple messages with newlines', () => {
    expect(
      formatChatHistoryAsString([
        { role: 'human', content: 'Hi' },
        { role: 'assistant', content: 'Hello' },
      ]),
    ).toBe('User: Hi\nAI: Hello')
  })

  it('returns empty string for empty array', () => {
    expect(formatChatHistoryAsString([])).toBe('')
  })
})

describe('computeSimilarity', () => {
  it('returns 1 for identical vectors', () => {
    expect(computeSimilarity([1, 0, 0], [1, 0, 0])).toBeCloseTo(1)
  })

  it('returns 0 for orthogonal vectors', () => {
    expect(computeSimilarity([1, 0], [0, 1])).toBeCloseTo(0)
  })

  it('returns -1 for opposite vectors', () => {
    expect(computeSimilarity([1, 0], [-1, 0])).toBeCloseTo(-1)
  })

  it('returns a value between -1 and 1', () => {
    const result = computeSimilarity([1, 2, 3], [4, 5, 6])
    expect(result).toBeGreaterThanOrEqual(-1)
    expect(result).toBeLessThanOrEqual(1)
  })
})
