import { beforeEach, describe, expect, it } from 'vitest';
import contains, {
  clearContainerCache,
  injectCSS,
  removeCSS,
  updateCSS,
} from '../src/utils/dynamicCSS';

beforeEach(() => {
  clearContainerCache();
  document.head.innerHTML = '';
  document.body.innerHTML = '';
});

describe('contains', () => {
  it('returns false for a missing root', () => {
    expect(contains(null)).toBe(false);
    expect(contains(undefined)).toBe(false);
  });

  it('delegates to the native Node.contains', () => {
    const parent = document.createElement('div');
    const child = document.createElement('span');
    parent.append(child);

    expect(contains(parent, child)).toBe(true);
    expect(contains(parent, document.createElement('b'))).toBe(false);
  });

  it('walks parentNode when the root has no native contains', () => {
    const parent = document.createElement('div');
    const child = document.createElement('span');
    parent.append(child);

    // Simulate the IE11 path the fallback exists for.
    const rootLike = { parentNode: null } as unknown as Node;
    Object.defineProperty(child, 'parentNode', { value: rootLike, configurable: true });

    expect(contains(rootLike, child)).toBe(true);
    expect(contains(rootLike, document.createElement('i'))).toBe(false);
  });
});

describe('injectCSS', () => {
  it('appends a style node to <head> by default', () => {
    const node = injectCSS('.a { color: red }');

    expect(node.tagName).toBe('STYLE');
    expect(node.innerHTML).toBe('.a { color: red }');
    expect(node.getAttribute('data-rc-order')).toBe('append');
    expect(node.parentNode).toBe(document.head);
  });

  it('honours an explicit attachTo container', () => {
    const container = document.createElement('div');
    document.body.append(container);

    const node = injectCSS('.b {}', { attachTo: container });

    expect(node.parentNode).toBe(container);
  });

  it('sets the CSP nonce when supplied', () => {
    const node = injectCSS('.c {}', { csp: { nonce: 'abc123' } });

    expect(node.nonce).toBe('abc123');
  });

  it('prepends before the existing first child', () => {
    const container = document.createElement('div');
    const existing = document.createElement('span');
    container.append(existing);
    document.body.append(container);

    const node = injectCSS('.d {}', { attachTo: container, prepend: true });

    expect(container.firstChild).toBe(node);
    expect(node.getAttribute('data-rc-order')).toBe('prepend');
  });

  it('records the priority for a queued prepend', () => {
    const container = document.createElement('div');
    container.append(document.createElement('span'));
    document.body.append(container);

    const node = injectCSS('.e {}', { attachTo: container, prepend: 'queue', priority: 3 });

    expect(node.getAttribute('data-rc-order')).toBe('prependQueue');
    expect(node.getAttribute('data-rc-priority')).toBe('3');
  });

  it('orders a queued prepend after styles of lower or equal priority', () => {
    const container = document.createElement('div');
    container.append(document.createElement('span'));
    document.body.append(container);

    const low = injectCSS('.low {}', { attachTo: container, prepend: 'queue', priority: 1 });
    const high = injectCSS('.high {}', { attachTo: container, prepend: 'queue', priority: 5 });

    expect(low.nextSibling).toBe(high);
  });

  it('prepends ahead of a queued style with a higher priority', () => {
    const container = document.createElement('div');
    container.append(document.createElement('span'));
    document.body.append(container);

    injectCSS('.high {}', { attachTo: container, prepend: 'queue', priority: 5 });
    const low = injectCSS('.low {}', { attachTo: container, prepend: 'queue', priority: 1 });

    expect(container.firstChild).toBe(low);
  });
});

describe('updateCSS', () => {
  it('marks the injected node with the key', () => {
    const node = updateCSS('.f {}', 'key-f');

    expect(node.getAttribute('rc-util-key')).toBe('key-f');
    expect(node.innerHTML).toBe('.f {}');
  });

  it('supports a custom mark attribute, adding the data- prefix', () => {
    const withPrefix = updateCSS('.g {}', 'key-g', { mark: 'data-my-mark' });
    const withoutPrefix = updateCSS('.h {}', 'key-h', { mark: 'my-mark' });

    expect(withPrefix.getAttribute('data-my-mark')).toBe('key-g');
    expect(withoutPrefix.getAttribute('data-my-mark')).toBe('key-h');
  });

  it('reuses the existing node and rewrites its contents', () => {
    const first = updateCSS('.i { color: red }', 'key-i');
    const second = updateCSS('.i { color: blue }', 'key-i');

    expect(second).toBe(first);
    expect(second.innerHTML).toBe('.i { color: blue }');
    expect(document.head.querySelectorAll('style').length).toBe(1);
  });

  it('leaves an unchanged node untouched', () => {
    const first = updateCSS('.j {}', 'key-j');
    const second = updateCSS('.j {}', 'key-j');

    expect(second).toBe(first);
  });

  it('refreshes the nonce on an existing node', () => {
    updateCSS('.k {}', 'key-k', { csp: { nonce: 'one' } });
    const updated = updateCSS('.k {}', 'key-k', { csp: { nonce: 'two' } });

    expect(updated.nonce).toBe('two');
  });
});

describe('removeCSS', () => {
  it('removes a previously injected keyed style', () => {
    updateCSS('.l {}', 'key-l');
    expect(document.head.querySelectorAll('style').length).toBe(1);

    removeCSS('key-l');

    expect(document.head.querySelectorAll('style').length).toBe(0);
  });

  it('is a no-op for an unknown key', () => {
    expect(() => removeCSS('nope')).not.toThrow();
  });
});
