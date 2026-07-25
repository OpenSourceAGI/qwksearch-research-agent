import { EventEmitter } from 'stream'
import { describe, expect, it, vi } from 'vitest'

// stream-handler only needs the Document *type* from chat-agent-toolkit, which
// is erased at runtime — stub the module so the runner needn't build it.
vi.mock('chat-agent-toolkit', () => ({}))
vi.mock('research-agent-ui/api', () => ({ describeError: (e: unknown) => String(e) }))
vi.mock('@/lib/database', () => ({ getDB: () => undefined }))
vi.mock('@/lib/database/schema', () => ({ messages: {} }))

import { handleEmitterEvents } from '../stream-handler'

/** A minimal WritableStreamDefaultWriter stub that records writes. */
const makeWriter = () => {
  const chunks: string[] = []
  const decoder = new TextDecoder()
  return {
    chunks,
    write: vi.fn(async (bytes: Uint8Array) => {
      chunks.push(decoder.decode(bytes))
    }),
    close: vi.fn(async () => {}),
  } as unknown as WritableStreamDefaultWriter & { chunks: string[] }
}

/** Waits for all currently-queued microtasks/timers to settle. */
const flush = () => new Promise((r) => setTimeout(r, 0))

describe('handleEmitterEvents listener lifecycle', () => {
  it('detaches all listeners after the "end" event', async () => {
    const emitter = new EventEmitter()
    const writer = makeWriter()

    handleEmitterEvents(emitter, writer, new TextEncoder(), 'chat-1', null, undefined)

    emitter.emit('data', JSON.stringify({ type: 'response', data: 'hello' }))
    emitter.emit('end')
    await flush()

    expect(emitter.listenerCount('data')).toBe(0)
    expect(emitter.listenerCount('end')).toBe(0)
    expect(emitter.listenerCount('error')).toBe(0)
    expect(writer.close).toHaveBeenCalledTimes(1)
  })

  it('detaches all listeners after the "error" event', async () => {
    const emitter = new EventEmitter()
    const writer = makeWriter()

    handleEmitterEvents(emitter, writer, new TextEncoder(), 'chat-1', null, undefined)

    emitter.emit('error', JSON.stringify({ data: 'boom' }))
    await flush()

    expect(emitter.listenerCount('data')).toBe(0)
    expect(emitter.listenerCount('end')).toBe(0)
    expect(emitter.listenerCount('error')).toBe(0)
  })

  it('does not accumulate listeners when the bridge is re-attached on a reused emitter', async () => {
    const emitter = new EventEmitter()

    // Attach and tear down many times over the same emitter. Without cleanup
    // this would exceed the default 10-listener threshold and warn.
    for (let i = 0; i < 15; i++) {
      const writer = makeWriter()
      handleEmitterEvents(emitter, writer, new TextEncoder(), `chat-${i}`, null, undefined)
      emitter.emit('end')
      await flush()
    }

    expect(emitter.listenerCount('data')).toBe(0)
    expect(emitter.listenerCount('end')).toBe(0)
    expect(emitter.listenerCount('error')).toBe(0)
  })
})
