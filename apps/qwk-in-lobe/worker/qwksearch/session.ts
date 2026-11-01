/**
 * Session helpers for the QwkSearch feature routes.
 *
 * There is no sign-in form: favorites and documents belong to the request's
 * user (`@/server/modules/LocalUser`), the browser's guest user on the Worker
 * (`worker/users`), the same user its LobeHub requests run as.
 */

export const getUserId = async (_headers: Headers): Promise<string | null> => {
  try {
    const { getLocalUserId } = await import('@/server/modules/LocalUser');
    return await getLocalUserId();
  } catch (error) {
    console.error('[qwksearch] local user lookup failed:', error);
    return null;
  }
};

export class UnauthorizedError extends Error {
  constructor() {
    super('Unauthorized');
    this.name = 'UnauthorizedError';
  }
}

export const requireUserId = async (headers: Headers): Promise<string> => {
  const userId = await getUserId(headers);
  if (!userId) throw new UnauthorizedError();
  return userId;
};

export const unauthorizedResponse = () =>
  Response.json({ message: 'Authentication required' }, { status: 401 });
