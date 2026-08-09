import { vi } from 'vitest';

/**
 * Stand-in for `@cloudflare/puppeteer`. Tests swap in their own page/browser
 * behaviour via `setLaunchImpl`; the default is a browser that never resolves
 * a selector, which is the "login page did not appear" path.
 */
let launchImpl: (binding: unknown) => Promise<unknown> = async () => {
  throw new Error('launch not stubbed');
};

export function setLaunchImpl(impl: (binding: unknown) => Promise<unknown>) {
  launchImpl = impl;
}

export const launch = vi.fn((binding: unknown) => launchImpl(binding));

export default { launch };
