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
