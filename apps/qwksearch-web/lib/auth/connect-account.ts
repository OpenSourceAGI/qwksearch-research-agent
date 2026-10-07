/**
 * @fileoverview The account summary a connected partner site receives from
 * `/api/connect/token` and `/api/connect/me`: profile, API key, current plan
 * and the link that upgrades it. See ./connect.ts for the flow.
 */
import { and, eq, inArray } from "drizzle-orm";
import { getDB } from "@/lib/database";
import { subscription as subscriptionTable, user as userTable } from "@/lib/database/schema";
import { buildUpgradeUrl, getPaidPlans, planKey } from "@/lib/billing/payment-links";
import { newApiKey } from "./connect";

export interface ConnectAccount {
  user: { id: string; name: string; email: string; image: string | null };
  /** The user's QwkSearch API key — send it as `X-API-Key` to act as them. */
  apiKey: string;
  /** Lower-case plan key (`"free"`, `"pro"`, …). */
  plan: string;
  /** Stripe Payment Link for the next paid plan, tied to this user; null when already paid. */
  upgradeUrl: string | null;
}

/** Subscription states better-auth-stripe treats as paid. */
const PAID_STATUSES = ["active", "trialing"];

/**
 * Loads the account summary for a QwkSearch user, minting their API key on
 * first use (as `GET /api/user` does). Returns null for an unknown user.
 */
export async function loadConnectAccount(userId: string): Promise<ConnectAccount | null> {
  const db = getDB();
  const [u] = await db
    .select({
      id: userTable.id,
      name: userTable.name,
      email: userTable.email,
      image: userTable.image,
      apiKey: userTable.apiKey,
    })
    .from(userTable)
    .where(eq(userTable.id, userId))
    .limit(1);
  if (!u) return null;

  let apiKey = u.apiKey;
  if (!apiKey) {
    apiKey = newApiKey();
    await db.update(userTable).set({ apiKey, updatedAt: new Date() }).where(eq(userTable.id, userId));
  }

  let plan = "free";
  try {
    const [sub] = await db
      .select({ plan: subscriptionTable.plan })
      .from(subscriptionTable)
      .where(and(eq(subscriptionTable.referenceId, userId), inArray(subscriptionTable.status, PAID_STATUSES)))
      .limit(1);
    if (sub?.plan) plan = sub.plan.toLowerCase();
  } catch (error) {
    // A database without the subscription table (billing never configured)
    // simply has nobody on a paid plan.
    console.warn("[connect] subscription lookup failed:", error);
  }

  const nextPlan = plan === "free" ? getPaidPlans()[0] : undefined;
  const upgradeUrl = nextPlan && planKey(nextPlan) !== plan ? buildUpgradeUrl(nextPlan.url, u) : null;

  return {
    user: { id: u.id, name: u.name, email: u.email, image: u.image ?? null },
    apiKey,
    plan,
    upgradeUrl,
  };
}
