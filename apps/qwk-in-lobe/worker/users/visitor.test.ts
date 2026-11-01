// @vitest-environment node
import { describe, expect, it } from 'vitest';

import {
  buildVisitorCookie,
  isVisitorId,
  mintVisitorId,
  readVisitorId,
  resolveVisitor,
  VISITOR_COOKIE,
  withVisitorCookie,
} from './visitor';

const ID = `guest_${'a1'.repeat(16)}`;

describe('visitor ids', () => {
  it('mints unique, well-formed ids', () => {
    const a = mintVisitorId();
    const b = mintVisitorId();
    expect(isVisitorId(a)).toBe(true);
    expect(isVisitorId(b)).toBe(true);
    expect(a).not.toBe(b);
  });

  it('only accepts the minted shape', () => {
    expect(isVisitorId(ID)).toBe(true);
    expect(isVisitorId('qwk-local-user')).toBe(false);
    expect(isVisitorId(`${ID}x`)).toBe(false);
    expect(isVisitorId(`guest_${'A1'.repeat(16)}`)).toBe(false);
    expect(isVisitorId(undefined)).toBe(false);
  });

  it('reads the id among other cookies and ignores malformed values', () => {
    expect(readVisitorId(`LOBE_LOCALE=en-US; ${VISITOR_COOKIE}=${ID}; x=1`)).toBe(ID);
    expect(readVisitorId(`${VISITOR_COOKIE}=qwk-local-user`)).toBeUndefined();
    expect(readVisitorId(`not_${VISITOR_COOKIE}=${ID}`)).toBeUndefined();
    expect(readVisitorId(null)).toBeUndefined();
  });
});

describe('resolveVisitor', () => {
  it('reuses the cookie and sets nothing', () => {
    const request = new Request('https://lobe.example/', {
      headers: { cookie: `${VISITOR_COOKIE}=${ID}` },
    });
    expect(resolveVisitor(request)).toEqual({ visitorId: ID });
  });

  it('mints a secure HttpOnly cookie when there is none', () => {
    const { setCookie, visitorId } = resolveVisitor(new Request('https://lobe.example/'));
    expect(isVisitorId(visitorId)).toBe(true);
    expect(setCookie).toBe(buildVisitorCookie(visitorId, true));
    expect(setCookie).toContain('HttpOnly');
    expect(setCookie).toContain('SameSite=Lax');
    expect(setCookie).toContain('Secure');
  });

  it('leaves Secure off on plain http (local wrangler dev)', () => {
    const { setCookie } = resolveVisitor(new Request('http://127.0.0.1:8787/'));
    expect(setCookie).not.toContain('Secure');
  });
});

describe('withVisitorCookie', () => {
  it('appends to an immutable response without losing other cookies', async () => {
    const original = Response.redirect('https://lobe.example/next', 302);
    const response = withVisitorCookie(original, 'lobe_uid=x; Path=/');
    expect(response.status).toBe(302);
    expect(response.headers.get('set-cookie')).toContain('lobe_uid=x');
  });

  it('returns the same response when nothing was minted', () => {
    const original = new Response('ok');
    expect(withVisitorCookie(original, undefined)).toBe(original);
  });
});
