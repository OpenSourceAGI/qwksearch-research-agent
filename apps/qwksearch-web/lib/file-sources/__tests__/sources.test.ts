import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  getFileSources,
  saveFileSources,
  addFileSource,
  updateFileSource,
  deleteFileSource,
  getActiveFileSourceId,
  setActiveFileSourceId,
  getActiveFileSource,
  testFileSourceConnection,
} from '../sources'
import type { AnyFileSource } from '@/types/fileSource'

const STORAGE_KEY = 'REASON-file-sources'
const ACTIVE_SOURCE_KEY = 'REASON-active-file-source'

function createLocalStorageStub() {
  const store = new Map<string, string>()
  return {
    getItem: vi.fn((k: string) => (store.has(k) ? store.get(k)! : null)),
    setItem: vi.fn((k: string, v: string) => {
      store.set(k, v)
    }),
    removeItem: vi.fn((k: string) => {
      store.delete(k)
    }),
    clear: vi.fn(() => store.clear()),
    _store: store,
  }
}

let ls: ReturnType<typeof createLocalStorageStub>

beforeEach(() => {
  ls = createLocalStorageStub()
  vi.stubGlobal('localStorage', ls)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('getFileSources', () => {
  it('returns only the default local source when nothing is stored', () => {
    const sources = getFileSources()
    expect(sources).toHaveLength(1)
    expect(sources[0].id).toBe('local-default')
    expect(sources[0].type).toBe('local')
  })

  it('returns stored sources verbatim when they include the local default', () => {
    const stored = [
      { id: 'local-default', name: 'Local Files', type: 'local' },
      { id: 's3-1', name: 'My S3', type: 's3' },
    ]
    ls._store.set(STORAGE_KEY, JSON.stringify(stored))
    expect(getFileSources().map((s) => s.id)).toEqual(['local-default', 's3-1'])
  })

  it('prepends the local default when it is missing from stored sources', () => {
    ls._store.set(STORAGE_KEY, JSON.stringify([{ id: 's3-1', type: 's3' }]))
    const sources = getFileSources()
    expect(sources[0].id).toBe('local-default')
    expect(sources.map((s) => s.id)).toContain('s3-1')
  })

  it('falls back to the default source on malformed JSON', () => {
    ls._store.set(STORAGE_KEY, 'broken')
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const sources = getFileSources()
    expect(sources).toHaveLength(1)
    expect(sources[0].id).toBe('local-default')
    expect(spy).toHaveBeenCalled()
  })
})

describe('saveFileSources', () => {
  it('persists the given sources', () => {
    const sources = [{ id: 'local-default', type: 'local' }] as AnyFileSource[]
    saveFileSources(sources)
    expect(JSON.parse(ls._store.get(STORAGE_KEY)!)).toEqual(sources)
  })

  it('logs but does not throw when storage fails', () => {
    ls.setItem.mockImplementation(() => {
      throw new Error('full')
    })
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => saveFileSources([])).not.toThrow()
    expect(spy).toHaveBeenCalled()
  })
})

describe('addFileSource', () => {
  it('creates an id and timestamps and appends to the list', () => {
    const created = addFileSource({
      name: 'My S3',
      type: 's3',
      credentials: {} as any,
    } as any)
    expect(created.id).toMatch(/^s3-\d+$/)
    expect(created.createdAt).toBeTruthy()
    expect(created.updatedAt).toBeTruthy()
    const stored = getFileSources()
    expect(stored.find((s) => s.id === created.id)).toBeTruthy()
  })
})

describe('updateFileSource', () => {
  it('merges updates and bumps updatedAt', () => {
    ls._store.set(
      STORAGE_KEY,
      JSON.stringify([
        { id: 'local-default', name: 'Local Files', type: 'local' },
        { id: 's3-1', name: 'Old', type: 's3', updatedAt: 'old' },
      ]),
    )
    updateFileSource('s3-1', { name: 'New' } as any)
    const updated = getFileSources().find((s) => s.id === 's3-1')!
    expect(updated.name).toBe('New')
    expect(updated.updatedAt).not.toBe('old')
  })

  it('leaves other sources untouched', () => {
    ls._store.set(
      STORAGE_KEY,
      JSON.stringify([
        { id: 'local-default', name: 'Local Files', type: 'local' },
        { id: 's3-1', name: 'A', type: 's3' },
      ]),
    )
    updateFileSource('s3-1', { name: 'B' } as any)
    const local = getFileSources().find((s) => s.id === 'local-default')!
    expect(local.name).toBe('Local Files')
  })
})

describe('deleteFileSource', () => {
  it('removes a non-default source', () => {
    ls._store.set(
      STORAGE_KEY,
      JSON.stringify([
        { id: 'local-default', name: 'Local Files', type: 'local' },
        { id: 's3-1', type: 's3' },
      ]),
    )
    deleteFileSource('s3-1')
    expect(getFileSources().find((s) => s.id === 's3-1')).toBeUndefined()
  })

  it('refuses to delete the default local source', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    deleteFileSource('local-default')
    expect(getFileSources().find((s) => s.id === 'local-default')).toBeTruthy()
    expect(spy).toHaveBeenCalled()
  })

  it('switches the active source to local when the active source is deleted', () => {
    ls._store.set(
      STORAGE_KEY,
      JSON.stringify([
        { id: 'local-default', name: 'Local Files', type: 'local' },
        { id: 's3-1', type: 's3' },
      ]),
    )
    ls._store.set(ACTIVE_SOURCE_KEY, 's3-1')
    deleteFileSource('s3-1')
    expect(getActiveFileSourceId()).toBe('local-default')
  })
})

describe('active file source id', () => {
  it('defaults to local-default when unset', () => {
    expect(getActiveFileSourceId()).toBe('local-default')
  })

  it('round-trips a set value', () => {
    setActiveFileSourceId('s3-1')
    expect(getActiveFileSourceId()).toBe('s3-1')
  })

  it('returns local-default when reading throws', () => {
    ls.getItem.mockImplementation(() => {
      throw new Error('boom')
    })
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(getActiveFileSourceId()).toBe('local-default')
    expect(spy).toHaveBeenCalled()
  })

  it('logs but does not throw when writing fails', () => {
    ls.setItem.mockImplementation(() => {
      throw new Error('nope')
    })
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => setActiveFileSourceId('x')).not.toThrow()
    expect(spy).toHaveBeenCalled()
  })
})

describe('getActiveFileSource', () => {
  it('returns the source matching the active id', () => {
    ls._store.set(
      STORAGE_KEY,
      JSON.stringify([
        { id: 'local-default', name: 'Local Files', type: 'local' },
        { id: 's3-1', name: 'My S3', type: 's3' },
      ]),
    )
    ls._store.set(ACTIVE_SOURCE_KEY, 's3-1')
    expect(getActiveFileSource().id).toBe('s3-1')
  })

  it('falls back to the default local source when the active id is unknown', () => {
    ls._store.set(ACTIVE_SOURCE_KEY, 'ghost')
    expect(getActiveFileSource().id).toBe('local-default')
  })
})

describe('testFileSourceConnection', () => {
  it('returns true for a local source', async () => {
    await expect(
      testFileSourceConnection({ type: 'local' } as AnyFileSource),
    ).resolves.toBe(true)
  })

  it('returns false for a not-yet-implemented source type', async () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    await expect(
      testFileSourceConnection({ type: 's3' } as AnyFileSource),
    ).resolves.toBe(false)
    expect(spy).toHaveBeenCalled()
  })
})
