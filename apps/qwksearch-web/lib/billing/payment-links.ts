/**
 * @fileoverview Stripe Payment Link helpers shared by the server (webhook plan
 * resolution) and the client (upgrade buttons). Kept free of server-only
 * imports so the settings UI can use it directly.
 */
import { SubscriptionPlans, type SubscriptionPlan } from "../config/site";

/** Plans a user can upgrade to: anything with a real Stripe checkout URL. */
export function getPaidPlans(
  plans: SubscriptionPlan[] = SubscriptionPlans,
): SubscriptionPlan[] {
  return plans.filter((plan) => plan.price > 0 && /^https?:\/\//.test(plan.url));
}

/**
 * The better-auth-stripe plan name for a site plan ("Pro" -> "pro"). The
 * plugin lowercases plan names when it stores a subscription, so this is the
 * value that comes back from `authClient.subscription.list()`.
 */
export function planKey(plan: Pick<SubscriptionPlan, "name">): string {
  return plan.name.toLowerCase();
}

/**
 * Find the plan a Stripe price belongs to by its monthly amount, for payment
 * link checkouts whose price ID is not configured in the environment.
 */
export function planForUnitAmount(
  unitAmountCents: number | null | undefined,
  plans: SubscriptionPlan[] = SubscriptionPlans,
): SubscriptionPlan | undefined {
  if (typeof unitAmountCents !== "number") return undefined;
  return getPaidPlans(plans).find((plan) => plan.price * 100 === unitAmountCents);
}

// Stripe rejects a client_reference_id outside this charset/length and then
// drops it silently, which would leave the subscription unlinked.
const CLIENT_REFERENCE_ID = /^[A-Za-z0-9_-]{1,200}$/;

/**
 * Append the signed-in user to a Stripe Payment Link. `client_reference_id`
 * comes back on the `checkout.session.completed` webhook, which is how the
 * payment is tied to the account (see lib/billing/stripe.ts);
 * `prefilled_email` saves the user retyping their address at checkout.
 */
export function buildUpgradeUrl(
  paymentLink: string,
  user?: { id?: string | null; email?: string | null } | null,
): string {
  let url: URL;
  try {
    url = new URL(paymentLink);
  } catch {
    return paymentLink;
  }
  if (user?.id && CLIENT_REFERENCE_ID.test(user.id)) {
    url.searchParams.set("client_reference_id", user.id);
  }
  if (user?.email) {
    url.searchParams.set("prefilled_email", user.email);
  }
  return url.toString();
}
