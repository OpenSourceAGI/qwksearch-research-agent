/**
 * The user layer of {@link resolveExtractionSettings}, stored on D1.
 *
 * `extractSettings.ts` folds four layers into the settings the extraction chain
 * runs with — shipped defaults, Worker environment, the signed-in user's
 * overrides, then the request's query parameters. Until this module existed the
 * third layer had a type and no storage: `UserExtractionOverrides` was accepted
 * by the resolver and nothing ever produced one.
 *
 * This is that storage. It sits on the same D1 database as favorites and
 * documents, keyed by the same LobeHub Better Auth user id, because the
 * extraction chain is a QwkSearch feature and reaching into LobeHub's Postgres
 * `user_settings` from a Worker route would couple it to Hyperdrive for a
 * six-field preference blob.
 *
 * Two rules hold everywhere below:
 *
 * - **Overrides are validated twice** — once when written and once when read.
 *   The write pass is the real gate; the read pass means a row left by an older
 *   build, a hand-edited D1 row, or a knob that has since been removed cannot
 *   push an unvalidated value into the chain.
 * - **Reading never throws.** An article fetch must not 500 because a
 *   preferences row is unreadable, so every failure resolves to `{}` and the
 *   caller falls back to the operator's configuration.
 */
import { eq } from 'drizzle-orm';

import { getQwkDB } from './db';
import { normalizeOverrides, type UserExtractionOverrides } from './extractSettings';
import { extractionSettings } from './schema';
import { getUserId } from './session';

/** Validate and drop anything unrecognised. Shared by the read and write paths. */
const clean = (value: unknown): UserExtractionOverrides =>
  normalizeOverrides((value ?? {}) as UserExtractionOverrides);

/**
 * The stored overrides for one user, or `{}` when there is no row.
 *
 * `overrides` is a JSON column, but a row written before the column had a mode,
 * or by `wrangler d1 execute`, can still come back as a string — so a string is
 * parsed rather than trusted to be an object.
 */
export const loadUserExtractionOverrides = async (
  userId: string,
): Promise<UserExtractionOverrides> => {
  try {
    const [row] = await getQwkDB()
      .select()
      .from(extractionSettings)
      .where(eq(extractionSettings.userId, userId))
      .limit(1);

    if (!row?.overrides) return {};

    const stored = typeof row.overrides === 'string' ? JSON.parse(row.overrides) : row.overrides;
    return clean(stored);
  } catch (error) {
    console.error('[qwksearch] extraction settings read failed:', error);
    return {};
  }
};

/**
 * Replace a user's overrides with the validated form of `overrides`.
 *
 * A full replace rather than a merge: the pane always sends the whole set, and
 * a merge would leave no way to clear a single field. Returns what was stored,
 * which is what the pane should render — it differs from what was sent whenever
 * a value failed validation.
 */
export const saveUserExtractionOverrides = async (
  userId: string,
  overrides: unknown,
): Promise<UserExtractionOverrides> => {
  const cleaned = clean(overrides);

  await getQwkDB()
    .insert(extractionSettings)
    .values({ overrides: cleaned, updatedAt: new Date(), userId })
    .onConflictDoUpdate({
      set: { overrides: cleaned, updatedAt: new Date() },
      target: extractionSettings.userId,
    });

  return cleaned;
};

/** Drop a user's overrides, returning them to the operator's configuration. */
export const clearUserExtractionOverrides = async (userId: string): Promise<void> => {
  await getQwkDB().delete(extractionSettings).where(eq(extractionSettings.userId, userId));
};

/**
 * The overrides that apply to a request, or `{}` for an anonymous one.
 *
 * `/api/doc/article` serves signed-out callers too, so this resolves rather than
 * rejects: no cookie means no session lookup at all, which keeps the anonymous
 * path free of the auth round-trip it would otherwise pay on every extraction.
 */
export const userExtractionOverridesForRequest = async (
  headers: Headers,
): Promise<UserExtractionOverrides> => {
  if (!headers.get('cookie')) return {};

  const userId = await getUserId(headers);
  return userId ? loadUserExtractionOverrides(userId) : {};
};
