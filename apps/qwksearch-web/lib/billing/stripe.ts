/**
 * @fileoverview better-auth Stripe plugin setup. Subscriptions are sold
 * through the Stripe Payment Links in `SubscriptionPlans` (lib/config/site.ts);
 * the plugin verifies the webhook at `/api/auth/stripe/webhook`, keeps the
 * `subscription` table in sync, and serves the billing portal.
 *
 * A Payment Link checkout is not created by the plugin, so its webhook
 * carries none of the plugin's metadata. `linkPaymentLinkCheckout` fills that
 * gap: the upgrade button passes the user ID as `client_reference_id`, and on
 * `checkout.session.completed` the Stripe customer is attached to that user
 * and the subscription row is created. Later `customer.subscription.*`
 * events then find the row by its Stripe subscription ID as usual.
 */
import { stripe } from "@better-auth/stripe";
import Stripe from "stripe";
import { eq } from "drizzle-orm";
import { getQueryDB } from "../database";
import { subscription, user } from "../database/schema";
import { SubscriptionPlans } from "../config/site";
import { getPaidPlans, planForUnitAmount, planKey } from "./payment-links";

/** Days of free trial the Payment Links grant before the first charge. */
export const TRIAL_DAYS = 7;

/** Env var holding the Stripe price ID for each paid plan, e.g. STRIPE_PRICE_ID_PRO. */
function priceIdEnvName(planName: string): string {
  return `STRIPE_PRICE_ID_${planName.toUpperCase().replace(/[^A-Z0-9]+/g, "_")}`;
}

/** The plugin's plan list, derived from the site's paid plans. */
export function getStripePlans(env: Record<string, string | undefined> = process.env) {
  return getPaidPlans().map((plan) => ({
    name: planKey(plan),
    priceId: env[priceIdEnvName(plan.name)] || undefined,
    freeTrial: { days: TRIAL_DAYS },
  }));
}

function idOf(value: string | { id: string } | null | undefined): string | undefined {
  if (!value) return undefined;
  return typeof value === "string" ? value : value.id;
}

function toDate(seconds: number | null | undefined): Date | null {
  return typeof seconds === "number" ? new Date(seconds * 1000) : null;
}

/**
 * Resolve which site plan a Stripe price belongs to: by configured price ID
 * first, then by monthly amount so Payment Links work without any price IDs
 * set in the environment.
 */
export function resolvePlanName(
  price: { id: string; unit_amount: number | null },
  env: Record<string, string | undefined> = process.env,
): string | undefined {
  const byId = getStripePlans(env).find((plan) => plan.priceId && plan.priceId === price.id);
  if (byId) return byId.name;
  const byAmount = planForUnitAmount(price.unit_amount, SubscriptionPlans);
  return byAmount ? planKey(byAmount) : undefined;
}

/**
 * Tie a completed Payment Link checkout to the user named in its
 * `client_reference_id`. Idempotent: Stripe retries webhooks, so an existing
 * row for the subscription is left alone.
 */
export async function linkPaymentLinkCheckout(
  client: Stripe,
  session: Stripe.Checkout.Session,
): Promise<void> {
  if (session.mode !== "subscription") return;
  // Checkouts the plugin created itself are already handled by the plugin.
  if (session.metadata?.subscriptionId) return;

  const userId = session.client_reference_id;
  const customerId = idOf(session.customer);
  const stripeSubscriptionId = idOf(session.subscription);
  if (!userId || !customerId || !stripeSubscriptionId) return;

  const db = getQueryDB();
  const [owner] = await db
    .select({ id: user.id, stripeCustomerId: user.stripeCustomerId })
    .from(user)
    .where(eq(user.id, userId));
  if (!owner) {
    console.warn(`[stripe] Payment link checkout ${session.id} references unknown user ${userId}`);
    return;
  }

  if (owner.stripeCustomerId !== customerId) {
    await db.update(user).set({ stripeCustomerId: customerId }).where(eq(user.id, owner.id));
  }

  const [existing] = await db
    .select({ id: subscription.id })
    .from(subscription)
    .where(eq(subscription.stripeSubscriptionId, stripeSubscriptionId));
  if (existing) return;

  const stripeSubscription = await client.subscriptions.retrieve(stripeSubscriptionId);
  const item = stripeSubscription.items.data[0];
  const plan = item ? resolvePlanName(item.price) : undefined;
  if (!item || !plan) {
    console.warn(`[stripe] Subscription ${stripeSubscriptionId} matches no configured plan`);
    return;
  }

  await db.insert(subscription).values({
    id: crypto.randomUUID(),
    plan,
    referenceId: owner.id,
    stripeCustomerId: customerId,
    stripeSubscriptionId,
    status: stripeSubscription.status,
    periodStart: toDate(item.current_period_start),
    periodEnd: toDate(item.current_period_end),
    trialStart: toDate(stripeSubscription.trial_start),
    trialEnd: toDate(stripeSubscription.trial_end),
    cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
    cancelAt: toDate(stripeSubscription.cancel_at),
    canceledAt: toDate(stripeSubscription.canceled_at),
    endedAt: toDate(stripeSubscription.ended_at),
    seats: item.quantity ?? 1,
    billingInterval: item.price.recurring?.interval ?? null,
  });
}

/**
 * The Stripe plugin, or null when STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET
 * are unset so deployments without billing keep working unchanged.
 */
export function createStripePlugin(env: Record<string, string | undefined> = process.env) {
  const secretKey = env.STRIPE_SECRET_KEY;
  const webhookSecret = env.STRIPE_WEBHOOK_SECRET;
  if (!secretKey || !webhookSecret) return null;

  // The fetch client keeps the SDK off Node's http module on Workers.
  const client = new Stripe(secretKey, {
    httpClient: Stripe.createFetchHttpClient(),
  });

  return stripe({
    stripeClient: client,
    stripeWebhookSecret: webhookSecret,
    // Anonymous sessions create users too; a Stripe customer is only made
    // when someone actually pays through a Payment Link.
    createCustomerOnSignUp: false,
    subscription: {
      enabled: true,
      plans: getStripePlans(env),
    },
    onEvent: async (event) => {
      if (event.type === "checkout.session.completed") {
        await linkPaymentLinkCheckout(client, event.data.object);
      }
    },
  });
}
