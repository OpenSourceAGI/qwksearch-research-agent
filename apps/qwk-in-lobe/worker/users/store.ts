/**
 * Records Lobe's users in D1 (`lobe_users`, migration 0004).
 *
 * A user is written the first time an isolate sees them do something on the
 * backend, and their `lastSeenAt` is refreshed at most once an hour per isolate.
 * Page views alone write nothing, so crawlers that never call the API do not
 * fill the table.
 *
 * A failed write is logged and swallowed: the visitor's chats live in Postgres
 * and do not depend on this row, so an unmigrated or unbound D1 must not turn
 * every request into an error.
 */
import { sql } from 'drizzle-orm';

import { getCfEnv } from '../cf/env';
import { getQwkDB } from '../qwksearch/db';
import { lobeUsers } from '../qwksearch/schema';

const REFRESH_INTERVAL_MS = 60 * 60 * 1000;
const MAX_TRACKED_USERS = 10_000;

const lastRecorded = new Map<string, number>();
let warnedMissingBinding = false;

const describeFailure = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  return /no such table/i.test(message)
    ? `${message} — apply migrations/d1/0004_lobe_users.sql (bun run cf:d1:migrate)`
    : message;
};

export const recordUser = async (userId: string, now = Date.now()): Promise<void> => {
  const previous = lastRecorded.get(userId);
  if (previous !== undefined && now - previous < REFRESH_INTERVAL_MS) return;

  if (!getCfEnv()?.DB) {
    if (!warnedMissingBinding) {
      warnedMissingBinding = true;
      console.error('[lobe-users] the D1 binding `DB` is missing; users are not being recorded');
    }
    return;
  }

  if (lastRecorded.size >= MAX_TRACKED_USERS) lastRecorded.clear();
  lastRecorded.set(userId, now);

  try {
    await getQwkDB()
      .insert(lobeUsers)
      .values({ id: userId, kind: 'guest' })
      .onConflictDoUpdate({ set: { lastSeenAt: sql`(unixepoch())` }, target: lobeUsers.id });
  } catch (error) {
    // Forget the attempt so a later request retries once the table exists.
    lastRecorded.delete(userId);
    console.error(`[lobe-users] could not record user in D1: ${describeFailure(error)}`);
  }
};

/** Test hook. */
export const __resetRecordedUsers = () => {
  lastRecorded.clear();
  warnedMissingBinding = false;
};
