import { describe, expect, it, vi } from 'vitest';
import mitt from '../src/utils/mitt';

type Events = { foo: string; bar: number };

describe('mitt', () => {
  it('starts with an empty handler map', () => {
    expect(mitt().all.size).toBe(0);
  });

  it('adopts a handler map passed to the factory', () => {
    const all = new Map();
    expect(mitt(all).all).toBe(all);
  });

  it('calls a registered handler with the event payload', () => {
    const emitter = mitt<Events>();
    const handler = vi.fn();
    emitter.on('foo', handler);

    emitter.emit('foo', 'payload');

    expect(handler).toHaveBeenCalledWith('payload');
  });

  it('calls every handler registered for a type, in order', () => {
    const emitter = mitt<Events>();
    const calls: string[] = [];
    emitter.on('foo', () => calls.push('first'));
    emitter.on('foo', () => calls.push('second'));

    emitter.emit('foo', 'x');

    expect(calls).toEqual(['first', 'second']);
  });

  it('does not call handlers registered for a different type', () => {
    const emitter = mitt<Events>();
    const handler = vi.fn();
    emitter.on('bar', handler);

    emitter.emit('foo', 'x');

    expect(handler).not.toHaveBeenCalled();
  });

  it('emitting an unregistered type is a no-op', () => {
    expect(() => mitt<Events>().emit('foo', 'x')).not.toThrow();
  });

  it('calls wildcard handlers with the type and the payload, after typed ones', () => {
    const emitter = mitt<Events>();
    const calls: string[] = [];
    emitter.on('foo', () => calls.push('typed'));
    emitter.on('*', (type, event) => calls.push(`wildcard:${String(type)}:${String(event)}`));

    emitter.emit('foo', 'x');

    expect(calls).toEqual(['typed', 'wildcard:foo:x']);
  });

  it('removes a single handler with off', () => {
    const emitter = mitt<Events>();
    const kept = vi.fn();
    const removed = vi.fn();
    emitter.on('foo', kept);
    emitter.on('foo', removed);

    emitter.off('foo', removed);
    emitter.emit('foo', 'x');

    expect(kept).toHaveBeenCalledTimes(1);
    expect(removed).not.toHaveBeenCalled();
  });

  it('removes all handlers for a type when no handler is given', () => {
    const emitter = mitt<Events>();
    const handler = vi.fn();
    emitter.on('foo', handler);

    emitter.off('foo');
    emitter.emit('foo', 'x');

    expect(handler).not.toHaveBeenCalled();
  });

  it('off on an unknown type is a no-op', () => {
    expect(() => mitt<Events>().off('foo')).not.toThrow();
  });

  it('leaves other handlers intact when removing an unregistered handler', () => {
    const emitter = mitt<Events>();
    const kept = vi.fn();
    emitter.on('foo', kept);

    emitter.off('foo', vi.fn());
    emitter.emit('foo', 'x');

    // indexOf returns -1, which `>>> 0` turns into an index past the end of
    // the array, so splice removes nothing and the real handler survives.
    expect(emitter.all.get('foo')).toHaveLength(1);
    expect(kept).toHaveBeenCalledTimes(1);
  });

  it('is not disturbed by a handler unsubscribing during emit', () => {
    const emitter = mitt<Events>();
    const second = vi.fn();
    const first = vi.fn(() => emitter.off('foo', second));
    emitter.on('foo', first);
    emitter.on('foo', second);

    emitter.emit('foo', 'x');

    // emit iterates a copy, so the handler removed mid-dispatch still runs once.
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('supports symbol event types', () => {
    const type = Symbol('evt');
    const emitter = mitt<Record<symbol, string>>();
    const handler = vi.fn();
    emitter.on(type, handler);

    emitter.emit(type, 'x');

    expect(handler).toHaveBeenCalledWith('x');
  });
});
