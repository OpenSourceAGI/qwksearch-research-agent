import { drizzle } from "drizzle-orm/d1";
import { getCloudflareContext } from "../cloudflare-context";
import { cache } from "react";
import * as schema from "./schema";

export const getDB = cache(() => {
  try {
    const { env } = getCloudflareContext();
    if (!env.DB) throw new Error("D1 binding 'DB' is not configured");
    return drizzle(env.DB, { schema });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`D1 database unavailable: ${msg}`);
  }
});
