'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Check, ExternalLink, Loader2 } from 'lucide-react';
import { authClient } from '@/lib/auth/client';
import { cn } from '@/lib/utils';
import { buildUpgradeUrl, getPaidPlans, planKey } from '@/lib/billing/payment-links';

interface ActiveSubscription {
  plan: string;
  status?: string | null;
  trialEnd?: string | Date | null;
  periodEnd?: string | Date | null;
  cancelAtPeriodEnd?: boolean | null;
}

const ACTIVE_STATUSES = new Set(['active', 'trialing', 'past_due']);

function formatDate(value: string | Date | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toLocaleDateString();
}

/**
 * Current plan plus an upgrade button per paid plan. Upgrades open the
 * plan's Stripe Payment Link with the user attached (client_reference_id and
 * prefilled email), and the better-auth Stripe webhook links the resulting
 * subscription back to the account.
 */
export default function UpgradePlans({ user }: { user: { id: string; email?: string | null } }) {
  const [current, setCurrent] = useState<ActiveSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [openingPortal, setOpeningPortal] = useState(false);

  useEffect(() => {
    let cancelled = false;
    // The endpoint only exists when the server has Stripe keys; any failure
    // just means "no subscription on record", which leaves the Free plan shown.
    authClient.subscription
      .list({ query: {} })
      .then(({ data }) => {
        if (cancelled || !Array.isArray(data)) return;
        const active = (data as ActiveSubscription[]).find((sub) =>
          ACTIVE_STATUSES.has(sub.status ?? ''),
        );
        setCurrent(active ?? null);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const openBillingPortal = async () => {
    setOpeningPortal(true);
    try {
      const { error } = await authClient.subscription.billingPortal({
        returnUrl: window.location.href,
      });
      if (error) throw new Error(error.message);
    } catch {
      toast.error('Could not open the billing portal.');
      setOpeningPortal(false);
    }
  };

  const paidPlans = getPaidPlans();
  const currentPlan = paidPlans.find((plan) => planKey(plan) === current?.plan);
  const trialEnds = current?.status === 'trialing' ? formatDate(current.trialEnd) : null;
  const periodEnds = formatDate(current?.periodEnd);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-black/70 dark:text-white/70">
          {loading ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <>
              Current plan:{' '}
              <span className="font-medium text-black dark:text-white">
                {currentPlan?.name ?? (current ? current.plan : 'Free')}
              </span>
              {trialEnds && <> · trial ends {trialEnds}</>}
              {!trialEnds && current?.cancelAtPeriodEnd && periodEnds && <> · cancels {periodEnds}</>}
            </>
          )}
        </p>
        {current && (
          <button
            onClick={openBillingPortal}
            disabled={openingPortal}
            className="px-3 py-1.5 rounded-lg border border-black/20 dark:border-dark-200 text-xs text-black/80 dark:text-white/80 hover:bg-light-200 dark:hover:bg-dark-200 disabled:opacity-50 flex items-center gap-2 transition-colors"
          >
            {openingPortal && <Loader2 className="w-3 h-3 animate-spin" />}
            Manage billing
          </button>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {paidPlans.map((plan) => {
          const isCurrent = currentPlan?.name === plan.name;
          return (
            <div
              key={plan.name}
              className={cn(
                'rounded-lg border p-3 flex flex-col gap-2',
                isCurrent ? 'border-[#24A0ED]' : 'border-black/10 dark:border-dark-200',
              )}
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-sm font-medium text-black dark:text-white">{plan.name}</span>
                <span className="text-xs text-black/70 dark:text-white/70">${plan.price}/month</span>
              </div>
              {plan.description && (
                <p className="text-[11px] lg:text-xs text-black/50 dark:text-white/50">{plan.description}</p>
              )}
              {plan.trialDays ? (
                <p className="text-[11px] text-[#24A0ED]">{plan.trialDays}-day free trial</p>
              ) : null}
              {isCurrent ? (
                <span className="mt-auto inline-flex items-center gap-1 text-xs text-black/60 dark:text-white/60">
                  <Check className="w-3 h-3" /> Current plan
                </span>
              ) : (
                <a
                  href={buildUpgradeUrl(plan.url, user)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-auto px-4 py-2 rounded-lg bg-[#24A0ED] hover:bg-[#1a8fd1] text-white text-xs font-medium flex items-center justify-center gap-2 transition-colors"
                >
                  Upgrade to {plan.name}
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
