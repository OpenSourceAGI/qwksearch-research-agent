import { getDB, type QueryDB } from "@/lib/database";

/**
 * The admin modules' name for the shared query handle. See `QueryDB` in
 * `lib/database` for why `getDB()` cannot be used directly for anything
 * beyond a plain `select().from()`.
 */
export type AdminDB = QueryDB;

export const getAdminDB = (): AdminDB => getDB() as unknown as AdminDB;
