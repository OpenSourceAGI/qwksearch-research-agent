import { describe, expect, it, vi } from 'vitest';
import { ACCOUNT_URL, fetchSession, LOGIN_URL, signIn, signOut } from '../lib/qwksearch-auth';

const response = (body: unknown, ok = true) => ({ ok, json: async () => body }) as Response;

describe('fetchSession', () => {
  it('reads the user from the session cookie', async () => {
    const fetchMock = vi.fn(async () => response({ user: { id: 'u1', name: 'Ada' } }));
    expect(await fetchSession(fetchMock as any)).toEqual({ id: 'u1', name: 'Ada' });
    expect(fetchMock).toHaveBeenCalledWith('https://qwksearch.com/api/auth/get-session', { credentials: 'include' });
  });

  it('is null when signed out, refused or offline', async () => {
    expect(await fetchSession((async () => response(null)) as any)).toBeNull();
    expect(await fetchSession((async () => response({}, false)) as any)).toBeNull();
    expect(
      await fetchSession((async () => {
        throw new TypeError('Failed to fetch');
      }) as any)
    ).toBeNull();
  });
});

describe('sign in and out', () => {
  it('opens the web login page to sign in', () => {
    const create = vi.fn();
    vi.stubGlobal('chrome', { tabs: { create } });
    signIn();
    expect(create).toHaveBeenCalledWith({ url: LOGIN_URL });
  });

  it('falls back to the account page when sign-out is refused', async () => {
    const create = vi.fn();
    vi.stubGlobal('chrome', { tabs: { create } });
    expect(await signOut((async () => response({}, false)) as any)).toBe(false);
    expect(create).toHaveBeenCalledWith({ url: ACCOUNT_URL });
  });

  it('signs out in place when the API accepts it', async () => {
    const create = vi.fn();
    vi.stubGlobal('chrome', { tabs: { create } });
    expect(await signOut((async () => response({ success: true })) as any)).toBe(true);
    expect(create).not.toHaveBeenCalled();
  });
});
