import { drizzle } from "drizzle-orm/d1";
import { getCloudflareContext } from "vinext";
import { cache } from "react";
import * as schema from "./schema";

export const getDB = cache(() => {
  const { env } = getCloudflareContext();
  return drizzle(env.DB, { schema });
});
