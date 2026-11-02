import { getServerDB } from '@/database/core/db-adaptor';
import { UserModel } from '@/database/models/user';

/**
 * QwkSearch-in-Lobe has no sign-in form. Who a request runs as depends on the
 * host:
 *
 * - On the Cloudflare Worker every browser is its own guest user. The Worker
 *   gives each visitor a `lobe_uid` cookie, records the user in D1
 *   (`lobe_users`) and installs a request-user resolver here, so chats, agents
 *   and provider keys belong to that visitor alone. See `worker/users`.
 * - Everywhere else (Node dev server, desktop, tests), or when the Worker sets
 *   `LOBE_SHARED_USER=1`, no resolver is installed and every request runs as
 *   the one shared local user below.
 */
export const LOCAL_USER_ID = 'qwk-local-user';

/** Returns the current request's user id, or `undefined` for the local user. */
export type RequestUserResolver = () => Promise<string | undefined> | string | undefined;

// A process-wide slot rather than a module variable: the Worker installs the
// resolver from its entry, and the slot is shared by every copy of this module.
const RESOLVER_SLOT = '__LOBE_REQUEST_USER_RESOLVER__';

type GlobalWithResolver = typeof globalThis & { [RESOLVER_SLOT]?: RequestUserResolver };

export const setRequestUserResolver = (resolver: RequestUserResolver | undefined) => {
  (globalThis as GlobalWithResolver)[RESOLVER_SLOT] = resolver;
};

const getRequestUserResolver = () => (globalThis as GlobalWithResolver)[RESOLVER_SLOT];

/** Bounds the per-isolate "row exists" cache; a cleared entry only costs one no-op insert. */
const MAX_ENSURED_USERS = 10_000;

const ensured = new Map<string, Promise<void>>();

/**
 * Make sure a user's Postgres row exists (once per isolate and user), so
 * foreign keys from agents, sessions, messages, … resolve.
 */
const ensureUserRow = (userId: string): Promise<void> => {
  let pending = ensured.get(userId);
  if (pending) return pending;

  if (ensured.size >= MAX_ENSURED_USERS) ensured.clear();

  pending = (async () => {
    const db = await getServerDB();
    await UserModel.makeSureUserExist(db, userId);
  })().catch((error) => {
    ensured.delete(userId);
    throw error;
  });
  ensured.set(userId, pending);
  return pending;
};

/** Make sure the shared local user's row exists. */
export const ensureLocalUser = (): Promise<void> => ensureUserRow(LOCAL_USER_ID);

/**
 * The user id the current request runs as, after making sure its row exists:
 * the visitor's own guest user on the Worker, the shared local user elsewhere.
 */
export const getLocalUserId = async (): Promise<string> => {
  const requestUserId = await getRequestUserResolver()?.();
  const userId = requestUserId || LOCAL_USER_ID;

  await ensureUserRow(userId);
  return userId;
};
