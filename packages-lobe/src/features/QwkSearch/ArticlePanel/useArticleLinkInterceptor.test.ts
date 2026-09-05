import { describe, expect, it } from 'vitest';

import { shouldInterceptAnchor } from './useArticleLinkInterceptor';

const ORIGIN = 'https://qwksearch.com';

const anchorIn = (container: HTMLElement, attrs: Record<string, string>) => {
  const a = document.createElement('a');
  for (const [key, value] of Object.entries(attrs)) a.setAttribute(key, value);
  container.append(a);
  return a;
};

const messageContainer = () => {
  const el = document.createElement('div');
  el.setAttribute('data-message-id', 'msg_1');
  document.body.append(el);
  return el;
};

describe('shouldInterceptAnchor', () => {
  it('intercepts external http(s) links inside chat messages', () => {
    const a = anchorIn(messageContainer(), { href: 'https://example.com/story' });
    expect(shouldInterceptAnchor(a, ORIGIN)).toBe('https://example.com/story');
  });

  it('ignores links outside chat messages', () => {
    const plain = document.createElement('div');
    document.body.append(plain);
    const a = anchorIn(plain, { href: 'https://example.com/story' });
    expect(shouldInterceptAnchor(a, ORIGIN)).toBeNull();
  });

  it('ignores same-origin navigation, downloads, non-http schemes and opt-outs', () => {
    const container = messageContainer();
    expect(shouldInterceptAnchor(anchorIn(container, { href: '/agent/1' }), ORIGIN)).toBeNull();
    expect(shouldInterceptAnchor(anchorIn(container, { href: `${ORIGIN}/docs` }), ORIGIN)).toBeNull();
    expect(shouldInterceptAnchor(anchorIn(container, { href: 'mailto:a@b.c' }), ORIGIN)).toBeNull();
    expect(
      shouldInterceptAnchor(anchorIn(container, { download: '', href: 'https://x.com/f.pdf' }), ORIGIN),
    ).toBeNull();
    expect(
      shouldInterceptAnchor(
        anchorIn(container, { 'data-qwk-no-intercept': '', 'href': 'https://x.com/a' }),
        ORIGIN,
      ),
    ).toBeNull();
    expect(shouldInterceptAnchor(anchorIn(container, {}), ORIGIN)).toBeNull();
  });
});
