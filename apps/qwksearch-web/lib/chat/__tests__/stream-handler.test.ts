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

describe('handleEmitterEvents backpressure', () => {
  it('sends one frame per model chunk instead of one per word', async () => {
    const emitter = new EventEmitter()
    const writer = makeWriter()

    handleEmitterEvents(emitter, writer, new TextEncoder(), 'chat-1', null, undefined)

    emitter.emit('data', JSON.stringify({ type: 'response', data: 'one two three four' }))
    emitter.emit('end')
    await flush()

    const messages = writer.chunks.filter((c) => c.includes('"type":"message"'))
    expect(messages).toHaveLength(1)
    expect(messages[0]).toContain('one two three four')
  })

  it('installs waitForDrain so the producer cannot outrun a slow client', async () => {
    const emitter = new EventEmitter() as EventEmitter & {
      waitForDrain?: () => Promise<void>
    }

    // A writer that only completes a write when the test releases it: this is
    // the slow client whose backlog used to accumulate in the isolate.
    const released: (() => void)[] = []
    const writer = {
      chunks: [] as string[],
      write: vi.fn(
        () =>
          new Promise<void>((resolve) => {
            released.push(resolve)
          }),
      ),
      close: vi.fn(async () => {}),
    } as unknown as WritableStreamDefaultWriter & { chunks: string[] }

    handleEmitterEvents(emitter, writer, new TextEncoder(), 'chat-1', null, undefined)

    expect(typeof emitter.waitForDrain).toBe('function')

    emitter.emit('data', JSON.stringify({ type: 'response', data: 'first' }))
    emitter.emit('data', JSON.stringify({ type: 'response', data: 'second' }))
    await flush()

    // Only the first write is in flight; the second is still behind it, and
    // the producer awaiting waitForDrain has not been let go.
    expect(writer.write).toHaveBeenCalledTimes(1)

    let drained = false
    void emitter.waitForDrain?.().then(() => {
      drained = true
    })
    await flush()
    expect(drained).toBe(false)

    released.forEach((release) => release())
    await flush()
    released.forEach((release) => release())
    await flush()

    expect(writer.write).toHaveBeenCalledTimes(2)
    expect(drained).toBe(true)
  })

  it('stops writing once the client is gone instead of queueing into a dead stream', async () => {
    const emitter = new EventEmitter()
    const writer = {
      chunks: [] as string[],
      write: vi.fn(async () => {
        throw new Error('The stream was cancelled.')
      }),
      close: vi.fn(async () => {}),
    } as unknown as WritableStreamDefaultWriter & { chunks: string[] }

    vi.spyOn(console, 'error').mockImplementation(() => {})

    handleEmitterEvents(emitter, writer, new TextEncoder(), 'chat-1', null, undefined)

    emitter.emit('data', JSON.stringify({ type: 'response', data: 'first' }))
    await flush()

    // The failed write tore the bridge down, so the pipeline's later events
    // reach nothing at all.
    expect(emitter.listenerCount('data')).toBe(0)
    emitter.emit('data', JSON.stringify({ type: 'response', data: 'second' }))
    await flush()

    expect(writer.write).toHaveBeenCalledTimes(1)
  })
})
