import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  DEFAULT_REWRITE_MODES,
  getRewriteModes,
  saveRewriteModes,
  resetRewriteModes,
  type RewriteMode,
} from './rewrite-modes'

const STORAGE_KEY = 'REASON-rewrite-modes'

// Minimal in-memory localStorage stub for the node test environment.
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

describe('DEFAULT_REWRITE_MODES', () => {
  it('includes the five built-in modes with unique ids', () => {
    const ids = DEFAULT_REWRITE_MODES.map((m) => m.id)
    expect(ids).toEqual(['clarity', 'concise', 'summarize', 'rephrase', 'expand'])
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('gives every mode a name and prompt', () => {
    for (const mode of DEFAULT_REWRITE_MODES) {
      expect(mode.name).toBeTruthy()
      expect(mode.prompt.length).toBeGreaterThan(0)
    }
  })
})

describe('getRewriteModes', () => {
  it('returns the defaults when nothing is stored', () => {
    expect(getRewriteModes()).toEqual(DEFAULT_REWRITE_MODES)
  })

  it('returns the stored modes when present', () => {
    const custom: RewriteMode[] = [{ id: 'x', name: 'X', prompt: 'do x' }]
    ls._store.set(STORAGE_KEY, JSON.stringify(custom))
    expect(getRewriteModes()).toEqual(custom)
  })

  it('falls back to defaults on malformed JSON', () => {
    ls._store.set(STORAGE_KEY, '{not valid json')
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(getRewriteModes()).toEqual(DEFAULT_REWRITE_MODES)
    expect(spy).toHaveBeenCalled()
  })
})

describe('saveRewriteModes', () => {
  it('serialises the modes to localStorage', () => {
    const modes: RewriteMode[] = [{ id: 'y', name: 'Y', prompt: 'do y' }]
    saveRewriteModes(modes)
    expect(JSON.parse(ls._store.get(STORAGE_KEY)!)).toEqual(modes)
  })

  it('logs but does not throw when storage rejects', () => {
    ls.setItem.mockImplementation(() => {
      throw new Error('quota exceeded')
    })
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => saveRewriteModes([])).not.toThrow()
    expect(spy).toHaveBeenCalled()
  })
})

describe('resetRewriteModes', () => {
  it('writes the defaults back to storage', () => {
    ls._store.set(STORAGE_KEY, JSON.stringify([{ id: 'z', name: 'Z', prompt: 'z' }]))
    resetRewriteModes()
    expect(JSON.parse(ls._store.get(STORAGE_KEY)!)).toEqual(DEFAULT_REWRITE_MODES)
  })
})
