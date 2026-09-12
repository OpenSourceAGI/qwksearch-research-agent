import { beforeEach, describe, expect, it, vi, type MockedFunction } from 'vitest';
import grab from 'grab-url';
import { grabJson, HttpRequestError, isRetryableStatus } from '../src/api/http';

vi.mock('grab-url');
const mockGrab = grab as MockedFunction<typeof grab>;

const noDelay = { retryDelay: 0 };

/**
 * Collect the delays passed to `setTimeout` while a call runs, so a backoff can
 * be asserted exactly instead of being timed.
 */
function recordDelays(): () => number[] {
  const delays: number[] = [];
  const timeout = globalThis.setTimeout;
  vi.spyOn(globalThis, 'setTimeout').mockImplementation(((handler: TimerHandler, ms?: number) => {
    if (ms !== undefined) delays.push(ms);
    return timeout(handler, 0);
  }) as typeof globalThis.setTimeout);
  return () => delays;
}

describe('grabJson', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns the parsed body', async () => {
    mockGrab.mockResolvedValue({ temperature: 21 } as never);

    await expect(grabJson('https://example.test', 'Weather request')).resolves.toEqual({ temperature: 21 });
  });

  it('unwraps a body grab-url could not parse as root JSON', async () => {
    mockGrab.mockResolvedValue({ data: { temperature: 21 } } as never);

    await expect(grabJson('https://example.test', 'Weather request')).resolves.toEqual({ temperature: 21 });
  });

  it('keeps duplicate requests to one path alive', async () => {
    mockGrab.mockResolvedValue({ ok: true } as never);

    await grabJson('https://example.test', 'Weather request');

    // Several widgets share one upstream path; grab-url aborts the earlier
    // call of a duplicate path unless this is off.
    expect(mockGrab.mock.calls[0][1]).toMatchObject({ cancelOngoingIfNew: false });
  });

  it('labels a transport failure and carries the status', async () => {
    mockGrab.mockResolvedValue({ error: 'HTTP error: 400 Bad Request' } as never);

    const error = await grabJson('https://example.test', 'Weather request', noDelay).catch((e) => e);

    expect(error).toBeInstanceOf(HttpRequestError);
    expect(error.message).toBe('Weather request failed: 400 Bad Request');
    expect(error.status).toBe(400);
  });

  it('labels a 200 that carries an error flag', async () => {
    mockGrab.mockResolvedValue({ error: true, reason: 'Invalid hourly variable' } as never);

    await expect(grabJson('https://example.test', 'Weather request', noDelay)).rejects.toThrow(
      'Weather request failed: Invalid hourly variable'
    );
  });

  it('labels an empty response', async () => {
    mockGrab.mockResolvedValue(null as never);

    await expect(grabJson('https://example.test', 'Weather request', noDelay)).rejects.toThrow(
      'Weather request failed: empty response'
    );
  });

  it('repeats a request the upstream was too busy to serve', async () => {
    mockGrab
      .mockResolvedValueOnce({ error: 'HTTP error: 429 Too Many Requests' } as never)
      .mockResolvedValueOnce({ error: 'HTTP error: 503 Service Unavailable' } as never)
      .mockResolvedValueOnce({ temperature: 21 } as never);

    await expect(grabJson('https://example.test', 'Weather request', noDelay)).resolves.toEqual({
      temperature: 21,
    });
    expect(mockGrab).toHaveBeenCalledTimes(3);
  });

  it('repeats a request that never reached the server', async () => {
    mockGrab
      .mockResolvedValueOnce({ error: 'Request timed out' } as never)
      .mockResolvedValueOnce({ temperature: 21 } as never);

    await expect(grabJson('https://example.test', 'Weather request', noDelay)).resolves.toEqual({
      temperature: 21,
    });
  });

  it('gives up immediately on a request the server called invalid', async () => {
    mockGrab.mockResolvedValue({ error: 'HTTP error: 400 Bad Request' } as never);

    await expect(grabJson('https://example.test', 'Weather request', noDelay)).rejects.toThrow(
      '400 Bad Request'
    );
    // Replaying a malformed request only burns the upstream's rate limit.
    expect(mockGrab).toHaveBeenCalledTimes(1);
  });

  it('repeats even a 4xx when asked to', async () => {
    mockGrab.mockResolvedValue({ error: 'HTTP error: 400 Bad Request' } as never);

    await expect(
      grabJson('https://example.test', 'Weather request', { ...noDelay, retryClientErrors: true })
    ).rejects.toThrow('400 Bad Request');
    expect(mockGrab).toHaveBeenCalledTimes(3);
  });

  it('stops after the configured number of attempts', async () => {
    mockGrab.mockResolvedValue({ error: 'HTTP error: 503 Service Unavailable' } as never);

    await expect(
      grabJson('https://example.test', 'Weather request', { ...noDelay, attempts: 2 })
    ).rejects.toThrow('503 Service Unavailable');
    expect(mockGrab).toHaveBeenCalledTimes(2);
  });

  it('backs off exponentially between tries', async () => {
    mockGrab
      .mockResolvedValueOnce({ error: 'HTTP error: 503 Service Unavailable' } as never)
      .mockResolvedValueOnce({ error: 'HTTP error: 503 Service Unavailable' } as never)
      .mockResolvedValueOnce({ temperature: 21 } as never);

    // The delays asked for, rather than the time that passed: a wall-clock
    // assertion on a 60ms budget reads a millisecond short often enough to
    // fail a loaded CI run.
    const delays = recordDelays();
    await grabJson('https://example.test', 'Weather request', { retryDelay: 20 });

    expect(delays()).toEqual([20, 40]);
  });

  it('repeats a rate-limited 200 but not a rejected query', () => {
    expect(isRetryableStatus(429)).toBe(true);
    expect(isRetryableStatus(500)).toBe(true);
    expect(isRetryableStatus(undefined)).toBe(true);
    expect(isRetryableStatus(400)).toBe(false);
    expect(isRetryableStatus(404)).toBe(false);
  });
});
