import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  SSR_ERROR_PREFIX,
  SSR_TRACE_PREFIX,
  describeError,
  isSsrTraceEnabled,
  logSsrError,
  traceSsr,
} from '../ssr-trace';

const VINEXT_ORIGINAL_SERVER_ERROR = Symbol.for('vinext.originalServerError');

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe('isSsrTraceEnabled', () => {
  it('is on by default, so a production 500 is already traced when it happens', () => {
    vi.stubEnv('QS_SSR_TRACE', '');
    expect(isSsrTraceEnabled()).toBe(true);
  });

  it.each(['off', 'OFF', ' off ', '0', 'false', 'no'])('is off for %o', (value) => {
    vi.stubEnv('QS_SSR_TRACE', value);
    expect(isSsrTraceEnabled()).toBe(false);
  });
});

describe('traceSsr', () => {
  it('prints a prefixed, sequenced breadcrumb with its details', () => {
    vi.stubEnv('QS_SSR_TRACE', 'on');
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});

    traceSsr('layout:render:enter', { theme: 'modern-minimal' });

    expect(log).toHaveBeenCalledTimes(1);
    const line = log.mock.calls[0]?.[0] as string;
    expect(line).toContain(SSR_TRACE_PREFIX);
    expect(line).toContain('layout:render:enter');
    expect(line).toContain('"theme":"modern-minimal"');
  });

  it('says nothing once the trace is switched off', () => {
    vi.stubEnv('QS_SSR_TRACE', 'off');
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});

    traceSsr('layout:render:enter');

    expect(log).not.toHaveBeenCalled();
  });

  it('survives details that do not serialize', () => {
    vi.stubEnv('QS_SSR_TRACE', 'on');
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const circular: Record<string, unknown> = {};
    circular.self = circular;

    expect(() => traceSsr('worker:request', circular)).not.toThrow();
    expect(log.mock.calls[0]?.[0]).toContain('[circular]');
  });
});

describe('describeError', () => {
  it('flattens an Error into name, message and stack', () => {
    const described = describeError(new TypeError('document is not defined'));

    expect(described.name).toBe('TypeError');
    expect(described.message).toBe('document is not defined');
    expect(described.stack).toContain('TypeError');
  });

  it('unwraps vinext’s production redaction to the real error', () => {
    const original = new ReferenceError('window is not defined');
    const redacted = new Error('The specific message is omitted in production builds');
    Object.assign(redacted, { digest: '1234567890' });
    Object.defineProperty(redacted, VINEXT_ORIGINAL_SERVER_ERROR, {
      value: original,
      enumerable: false,
    });

    const described = describeError(redacted);

    expect(described.message).toBe('window is not defined');
    expect(described.name).toBe('ReferenceError');
    expect(described.unwrappedFromVinextDigest).toBe('1234567890');
  });

  it('follows the cause chain', () => {
    const described = describeError(
      new Error('render failed', { cause: new Error('chunk load failed') }),
    );

    expect(described.cause?.message).toBe('chunk load failed');
  });

  it('describes a thrown non-Error rather than losing it', () => {
    expect(describeError('boom').thrownValue).toBe('boom');
    expect(describeError({ code: 'ENOENT' }).thrownValue).toContain('ENOENT');
  });

  it('stops following a self-referencing cause chain', () => {
    const looping = new Error('loop');
    Object.defineProperty(looping, 'cause', { value: looping });

    expect(() => describeError(looping)).not.toThrow();
  });
});

describe('logSsrError', () => {
  it('prints even when breadcrumbs are switched off', () => {
    vi.stubEnv('QS_SSR_TRACE', 'off');
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});

    logSsrError('global-error:render', new Error('boom'), { path: '/' });

    expect(error).toHaveBeenCalledTimes(1);
    expect(error.mock.calls[0]?.[0]).toContain(SSR_ERROR_PREFIX);
    expect(error.mock.calls[0]?.[1]).toContain('"message":"boom"');
    expect(error.mock.calls[0]?.[1]).toContain('"path":"/"');
  });
});
