import type { BaseSQLiteDatabase } from "drizzle-orm/sqlite-core";
import { drizzle as drizzleD1 } from "drizzle-orm/d1";
import { drizzle as drizzleLibsql } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import { getCloudflareContext } from "../cloudflare/context";
import { cache } from "react";
import * as schema from "./schema";
import { sessionedD1 } from "./d1-session";

/**
 * The D1 binding is routed through `sessionedD1()` so that, with read
 * replication enabled, every query in a request shares one D1 session and
 * therefore one sequentially consistent view of the database — see
 * ./d1-session.ts. Outside a session scope it is a pass-through.
 */
export const getDB = cache(() => {
  try {
    // Try Cloudflare D1 first (production)
    const { env } = getCloudflareContext();
    if (env.DB) {
      console.log("[getDB] Using Cloudflare D1 database");
      return drizzleD1(sessionedD1(env.DB), { schema });
    }
  } catch (err) {
    console.log("[getDB] D1 not available, trying local SQLite:", err);
  }

  // Fallback to local SQLite for development
  try {
    const databaseUrl = process.env.DATABASE_URL || "file:./data/qwksearch.db";
    console.log("[getDB] Using local SQLite database:", databaseUrl);
    const client = createClient({
      url: databaseUrl,
    });
    return drizzleLibsql(client, { schema });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Database unavailable: ${msg}`);
  }
});

/**
 * `getDB()` returns a union of the D1 and libsql drizzle handles, and calling
 * a method on a union of two differently-parameterised signatures does not
 * type-check — `db.select({ ... })` reports "expected 0 arguments". Both
 * handles extend the same async SQLite base, so a module that builds anything
 * beyond a plain `select().from()` takes that base type and keeps full
 * inference on the query builder.
 */
export type QueryDB = BaseSQLiteDatabase<"async", unknown, Record<string, never>>;

export const getQueryDB = (): QueryDB => getDB() as unknown as QueryDB;
