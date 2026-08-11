import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  authenticateConnection,
  authorizeDocument,
  parseRoom,
  resolveUser,
} from '../src/rooms';

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
  vi.unstubAllGlobals();
});

describe('parseRoom', () => {
  it('accepts both engines', () => {
    expect(parseRoom('reason-editor:tiptap:abc')).toEqual({
      engine: 'tiptap',
      documentId: 'abc',
    });
    expect(parseRoom('reason-editor:plate:abc')).toEqual({
      engine: 'plate',
      documentId: 'abc',
    });
  });

  it('keeps colons inside the document id', () => {
    expect(parseRoom('reason-editor:plate:a:b')).toEqual({
      engine: 'plate',
      documentId: 'a:b',
    });
  });

  it.each([
    'other:plate:abc',
    'reason-editor:lexical:abc',
    'reason-editor:plate:',
    'reason-editor',
    '',
  ])('rejects %j', (room) => {
    expect(parseRoom(room)).toBeNull();
  });
});

describe('resolveUser', () => {
  it('rejects an empty token', async () => {
    await expect(resolveUser(undefined)).resolves.toBeNull();
    await expect(resolveUser('')).resolves.toBeNull();
  });

  it('refuses unverified tokens in production', async () => {
    process.env.NODE_ENV = 'production';
    delete process.env.REASON_AUTH_URL;

    await expect(resolveUser('anything')).rejects.toThrow(/REASON_AUTH_URL/);
  });

  it('verifies the token against the session endpoint when configured', async () => {
    process.env.REASON_AUTH_URL = 'https://auth.test/session';
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ id: 'u1', name: 'Ada' }), { status: 200 }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(resolveUser('tok')).resolves.toEqual({ id: 'u1', name: 'Ada' });
    expect(fetchMock).toHaveBeenCalledWith('https://auth.test/session', {
      headers: { authorization: 'Bearer tok' },
    });
  });

  it('returns null when the session endpoint rejects the token', async () => {
    process.env.REASON_AUTH_URL = 'https://auth.test/session';
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 401 })));

    await expect(resolveUser('bad')).resolves.toBeNull();
  });
});

describe('authorizeDocument', () => {
  it('refuses blanket access in production', async () => {
    process.env.NODE_ENV = 'production';
    delete process.env.REASON_DOCUMENT_ACL_URL;

    await expect(authorizeDocument({ id: 'u1', name: 'Ada' }, 'doc')).rejects.toThrow(
      /REASON_DOCUMENT_ACL_URL/,
    );
  });

  it('returns the role the ACL grants', async () => {
    process.env.REASON_DOCUMENT_ACL_URL = 'https://acl.test/check';
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ role: 'read' }), { status: 200 })),
    );

    await expect(authorizeDocument({ id: 'u1', name: 'Ada' }, 'doc')).resolves.toBe('read');
  });

  it('denies when the ACL returns no role', async () => {
    process.env.REASON_DOCUMENT_ACL_URL = 'https://acl.test/check';
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({}), { status: 200 })),
    );

    await expect(authorizeDocument({ id: 'u1', name: 'Ada' }, 'doc')).resolves.toBeNull();
  });
});

describe('authenticateConnection', () => {
  it('rejects a malformed room before touching auth', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      authenticateConnection({ documentName: 'reason-editor:lexical:abc', token: 'tok' }),
    ).rejects.toThrow(/Invalid document room/);

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects a connection with no token', async () => {
    await expect(
      authenticateConnection({ documentName: 'reason-editor:plate:abc' }),
    ).rejects.toThrow(/Unauthorized/);
  });

  it('rejects a user who may not read the document', async () => {
    process.env.REASON_DOCUMENT_ACL_URL = 'https://acl.test/check';
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ role: 'none' }), { status: 200 })),
    );

    await expect(
      authenticateConnection({ documentName: 'reason-editor:plate:abc', token: 'mallory' }),
    ).rejects.toThrow(/Forbidden/);
  });

  it('marks a read-only grant as read-only', async () => {
    process.env.REASON_DOCUMENT_ACL_URL = 'https://acl.test/check';
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ role: 'read' }), { status: 200 })),
    );

    await expect(
      authenticateConnection({ documentName: 'reason-editor:tiptap:abc', token: 'u1' }),
    ).resolves.toEqual({
      user: { id: 'u1', name: 'u1' },
      engine: 'tiptap',
      documentId: 'abc',
      readOnly: true,
    });
  });
});
