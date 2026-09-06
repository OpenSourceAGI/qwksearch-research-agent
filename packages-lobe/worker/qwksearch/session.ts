/**
 * Session helpers for the QwkSearch feature routes.
 *
 * QwkSearch's original routes used its own Better Auth instance; here the
 * LobeHub Better Auth session is the single source of truth, so favorites and
 * documents are keyed by the LobeHub user id.
 */
import { auth } from '@/auth';

export const getUserId = async (headers: Headers): Promise<string | null> => {
  try {
    const session = await auth.api.getSession({ headers });
    return session?.user?.id ?? null;
  } catch (error) {
    console.error('[qwksearch] session lookup failed:', error);
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
