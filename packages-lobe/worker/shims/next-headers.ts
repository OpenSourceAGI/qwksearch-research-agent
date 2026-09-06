/**
 * `next/headers` replacement: reads the current request from the Worker's
 * AsyncLocalStorage-backed request context.
 */
import { parse as parseCookie } from 'cookie';

import { getCurrentRequest } from '../cf/requestContext';

const requireRequest = () => {
  const request = getCurrentRequest();
  if (!request) {
    throw new Error(
      '[next/headers shim] no request context: call runWithRequestContext() around the handler',
    );
  }
  return request;
};

export const headers = async (): Promise<Headers> => new Headers(requireRequest().headers);

export const cookies = async () => {
  const header = requireRequest().headers.get('cookie');
  const parsed: Record<string, string | undefined> = header ? parseCookie(header) : {};

  return {
    get: (name: string) => {
      const value = parsed[name];
      return value === undefined ? undefined : { name, value };
    },
    getAll: () =>
      Object.entries(parsed)
        .filter(([, value]) => value !== undefined)
        .map(([name, value]) => ({ name, value: value as string })),
    has: (name: string) => parsed[name] !== undefined,
    // Mutations are not supported through this API on Workers; route handlers
    // set cookies on their Response instead.
    set: () => undefined,
    delete: () => undefined,
  };
};

export const draftMode = async () => ({ isEnabled: false });
