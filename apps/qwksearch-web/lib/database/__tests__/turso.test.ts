import { describe, expect, it } from 'vitest'
import { tursoQueries } from '../turso'

// tursoQueries is a stub surface; these tests pin its current contract so a
// future real implementation has a behavioural baseline to compare against.

describe('tursoQueries stub contract', () => {
  it('getGoogleDocSync resolves to null', async () => {
    expect(await tursoQueries.getGoogleDocSync('doc1')).toBeNull()
  })

  it('deleteGoogleDocSync resolves to undefined', async () => {
    expect(await tursoQueries.deleteGoogleDocSync('doc1')).toBeUndefined()
  })

  it('getQuotesByDocument resolves to an empty array', async () => {
    expect(await tursoQueries.getQuotesByDocument('doc1')).toEqual([])
  })

  it('createQuote echoes the id', async () => {
    const result = await tursoQueries.createQuote(
      'q1',
      'doc1',
      'text',
      null,
      null,
      null,
      null,
      null,
      '2024-01-01',
    )
    expect(result).toEqual({ id: 'q1' })
  })

  it('updateQuote resolves to undefined', async () => {
    expect(
      await tursoQueries.updateQuote('t', null, null, null, null, null, 'q1'),
    ).toBeUndefined()
  })

  it('deleteQuote resolves to undefined', async () => {
    expect(await tursoQueries.deleteQuote('q1')).toBeUndefined()
  })

  it('getDocument resolves to null', async () => {
    expect(await tursoQueries.getDocument('doc1')).toBeNull()
  })

  it('getShareTokenByDocumentId resolves to null', async () => {
    expect(await tursoQueries.getShareTokenByDocumentId('doc1')).toBeNull()
  })

  it('createShareToken resolves to undefined', async () => {
    expect(
      await tursoQueries.createShareToken('s1', 'doc1', '2024-01-01'),
    ).toBeUndefined()
  })

  it('getShareToken resolves to null', async () => {
    expect(await tursoQueries.getShareToken('s1')).toBeNull()
  })
})
