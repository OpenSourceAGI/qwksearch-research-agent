/**
 * Tests for the centralized upload management helpers.
 *
 * The Cloudflare runtime and D1 database are mocked so these run under plain
 * Node: `@/lib/cloudflare-context` exposes an in-memory R2 stub (exercising the
 * native Workers binding path), and `@/lib/database` exposes a hand-rolled
 * Drizzle-shaped query builder backed by controllable in-memory state.
 */
import { describe, expect, it, beforeEach, vi } from 'vitest'

// Shared mock state, hoisted so the vi.mock factories below can reference it.
const mocks = vi.hoisted(() => {
  const makeR2 = () => {
    const store = new Map<string, string>()
    return {
      store,
      put: vi.fn(async (key: string, body: Buffer | string) => {
        store.set(key, typeof body === 'string' ? body : body.toString('utf-8'))
      }),
      get: vi.fn(async (key: string) => {
        if (!store.has(key)) return null
        return { text: async () => store.get(key)! }
      }),
      delete: vi.fn(async (key: string) => {
        store.delete(key)
      }),
    }
  }

  return {
    r2: makeR2(),
    db: {
      selectRows: [] as any[],
      inserted: [] as any[],
      deleted: [] as any[],
    },
  }
})

vi.mock('@/lib/cloudflare-context', () => ({
  getCloudflareContext: () => ({ env: { R2: mocks.r2 }, cf: undefined, ctx: null }),
}))

vi.mock('@/lib/database', () => {
  // A thenable that also exposes `.orderBy()` so both
  // `select().from().where()` and `select().from().where().orderBy()` work.
  const thenable = (rows: any[]) => ({
    orderBy: () => Promise.resolve(rows),
    then: (onF: any, onR: any) => Promise.resolve(rows).then(onF, onR),
  })
  return {
    getDB: () => ({
      select: () => ({ from: () => ({ where: () => thenable(mocks.db.selectRows) }) }),
      insert: () => ({
        values: (v: any) => {
          mocks.db.inserted.push(v)
          return Promise.resolve()
        },
      }),
      delete: () => ({
        where: () => {
          mocks.db.deleted.push(true)
          return Promise.resolve()
        },
      }),
    }),
  }
})

vi.mock('extract-pdf', () => ({
  convertPDFToHTML: vi.fn(async () => ({ error: null, html: '<p>pdf text</p>' })),
}))

vi.mock('extract-webpage', () => ({
  convertDOCXToHTML: vi.fn(async () => '<p>docx text</p>'),
  extractContent: vi.fn(async (html: string) => ({
    error: null,
    html: '<article>cleaned html</article>',
  })),
}))

import {
  originalObjectKey,
  extractedObjectKey,
  extractUploadText,
  storeUpload,
  getExtractedUpload,
  getUserUploadQuota,
  deleteUploadObjects,
  MAX_FILE_SIZE_BYTES,
  USER_STORAGE_QUOTA_BYTES,
  SUPPORTED_UPLOAD_EXTENSIONS,
} from '../index'

beforeEach(() => {
  mocks.r2.store.clear()
  mocks.r2.put.mockClear()
  mocks.r2.get.mockClear()
  mocks.r2.delete.mockClear()
  mocks.db.selectRows = []
  mocks.db.inserted = []
  mocks.db.deleted = []
})

describe('object key builders', () => {
  it('builds the original object key from id + extension', () => {
    expect(originalObjectKey('abc123', 'pdf')).toBe('abc123.pdf')
  })

  it('builds the extracted object key from id', () => {
    expect(extractedObjectKey('abc123')).toBe('abc123-extracted.json')
  })
})

describe('constants', () => {
  it('exposes the expected limits', () => {
    expect(MAX_FILE_SIZE_BYTES).toBe(50 * 1024 * 1024)
    expect(USER_STORAGE_QUOTA_BYTES).toBe(1024 * 1024 * 1024)
    expect(SUPPORTED_UPLOAD_EXTENSIONS).toContain('pdf')
    expect(SUPPORTED_UPLOAD_EXTENSIONS).toContain('docx')
  })
})

describe('extractUploadText', () => {
  it('returns plain text unchanged for txt/md', async () => {
    const buf = Buffer.from('hello world', 'utf-8')
    expect(await extractUploadText(buf, 'a.txt', 'txt')).toBe('hello world')
    expect(await extractUploadText(buf, 'a.md', 'md')).toBe('hello world')
  })

  it('extracts HTML content via extract-webpage', async () => {
    const buf = Buffer.from('<html><body>x</body></html>', 'utf-8')
    expect(await extractUploadText(buf, 'a.html', 'html')).toBe(
      '<article>cleaned html</article>',
    )
  })

  it('converts PDF to HTML via extract-pdf', async () => {
    const out = await extractUploadText(Buffer.from('%PDF'), 'a.pdf', 'pdf')
    expect(out).toBe('<p>pdf text</p>')
  })

  it('converts DOCX to HTML via extract-webpage', async () => {
    const out = await extractUploadText(Buffer.from('PK'), 'a.docx', 'docx')
    expect(out).toBe('<p>docx text</p>')
  })

  it('returns an empty string when extraction throws', async () => {
    const { convertPDFToHTML } = await import('extract-pdf')
    ;(convertPDFToHTML as any).mockRejectedValueOnce(new Error('boom'))
    expect(await extractUploadText(Buffer.from('%PDF'), 'a.pdf', 'pdf')).toBe('')
  })
})

describe('storeUpload', () => {
  it('stores the original file and extracted JSON in R2 and records the upload', async () => {
    await storeUpload({
      fileId: 'file-1',
      fileName: 'notes.txt',
      fileExtension: 'txt',
      size: 11,
      userId: 'user-1',
      originalBuffer: Buffer.from('hello world', 'utf-8'),
      extracted: { title: 'notes.txt', content: 'hello world' },
    })

    // Original + extracted objects both written to the uploads bucket.
    expect(mocks.r2.store.get('file-1.txt')).toBe('hello world')
    const extractedRaw = mocks.r2.store.get('file-1-extracted.json')
    expect(extractedRaw).toBeDefined()
    expect(JSON.parse(extractedRaw!)).toEqual({
      title: 'notes.txt',
      content: 'hello world',
    })

    // Quota accounting record inserted for the authenticated user.
    expect(mocks.db.inserted).toHaveLength(1)
    expect(mocks.db.inserted[0]).toMatchObject({
      fileId: 'file-1',
      userId: 'user-1',
      fileName: 'notes.txt',
      fileExtension: 'txt',
      size: 11,
    })
  })

  it('skips the original object and the DB record for guest uploads', async () => {
    await storeUpload({
      fileId: 'file-2',
      fileName: 'page',
      fileExtension: 'url',
      size: 5,
      userId: null,
      extracted: { title: 'page', content: 'body', url: 'https://x.test' },
    })

    // Only the extracted JSON is written (no original buffer supplied).
    expect(mocks.r2.store.has('file-2-extracted.json')).toBe(true)
    expect(mocks.db.inserted).toHaveLength(0)
  })
})

describe('getExtractedUpload', () => {
  it('reads and parses the extracted JSON back from R2', async () => {
    await storeUpload({
      fileId: 'file-3',
      fileName: 'doc.md',
      fileExtension: 'md',
      size: 3,
      userId: null,
      extracted: { title: 'Doc', content: 'abc' },
    })

    const extracted = await getExtractedUpload('file-3')
    expect(extracted).toEqual({ title: 'Doc', content: 'abc' })
  })

  it('returns null for a missing file', async () => {
    expect(await getExtractedUpload('does-not-exist')).toBeNull()
  })

  it('applies defaults for a payload missing fields', async () => {
    mocks.r2.store.set('file-4-extracted.json', JSON.stringify({}))
    const extracted = await getExtractedUpload('file-4')
    expect(extracted).toEqual({ title: 'Uploaded Document', content: '' })
  })
})

describe('getUserUploadQuota', () => {
  it('sums recorded sizes and reports remaining space', async () => {
    mocks.db.selectRows = [{ size: 100 }, { size: 200 }]
    const quota = await getUserUploadQuota('user-1', 50)
    expect(quota.used).toBe(300)
    expect(quota.quota).toBe(USER_STORAGE_QUOTA_BYTES)
    expect(quota.remaining).toBe(USER_STORAGE_QUOTA_BYTES - 300)
    expect(quota.allowed).toBe(true)
  })

  it('disallows an upload that would exceed the quota', async () => {
    mocks.db.selectRows = [{ size: USER_STORAGE_QUOTA_BYTES }]
    const quota = await getUserUploadQuota('user-1', 1)
    expect(quota.remaining).toBe(0)
    expect(quota.allowed).toBe(false)
  })
})

describe('deleteUploadObjects', () => {
  it('deletes both the extracted JSON and the original object', async () => {
    await storeUpload({
      fileId: 'file-5',
      fileName: 'notes.txt',
      fileExtension: 'txt',
      size: 4,
      userId: null,
      originalBuffer: Buffer.from('data', 'utf-8'),
      extracted: { title: 'notes.txt', content: 'data' },
    })
    expect(mocks.r2.store.size).toBe(2)

    await deleteUploadObjects('file-5', 'txt')
    expect(mocks.r2.store.has('file-5-extracted.json')).toBe(false)
    expect(mocks.r2.store.has('file-5.txt')).toBe(false)
  })
})
