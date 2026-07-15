import { CollectionMethod, Subscription, SubscriptionStatus } from './subscription.entity';
import { FREEZE_GRACE_DAYS } from './plans.config';

const GRACE_MS = FREEZE_GRACE_DAYS * 86400000;

/**
 * When a PAST_DUE subscription's grace period expires and it becomes "frozen".
 * Invoice-based billing counts from the invoice due date; automatic charging
 * counts from the period end. Returns null when we can't determine a date
 * (treated as immediately frozen by the callers).
 */
export function computeFreezeEffectiveAt(subscription: Subscription): number | null {
  if (subscription.collection_method === CollectionMethod.SEND_INVOICE) {
    if (subscription.latest_invoice_created && subscription.days_until_due != null) {
      return subscription.latest_invoice_created.getTime()
        + subscription.days_until_due * 86400000
        + GRACE_MS;
    }
    if (subscription.current_period_end) {
      return subscription.current_period_end.getTime() + GRACE_MS;
    }
    return null;
  }

  if (subscription.current_period_end) {
    return subscription.current_period_end.getTime() + GRACE_MS;
  }
  return null;
}

export type SubscriptionAccessDecision = {
  allowed: boolean;
  /** Set only when allowed is false. */
  reason?: 'TRIAL_EXPIRED' | 'SUBSCRIPTION_FROZEN';
  /** Set only when allowed is false. */
  message?: string;
};

/**
 * Single source of truth for "is this tenant's subscription in good enough
 * standing to keep using paid capability?". Used both by the generic write
 * freeze in PermissionGuard and by the AI/agent gates in AiPolicyService.
 *
 * `stripeConfigured` is the on-prem / single-tenant escape hatch: when billing
 * isn't configured there is no subscription to enforce, so everything is allowed.
 */
export function evaluateSubscriptionAccess(
  subscription: Subscription | null,
  now: number,
  stripeConfigured: boolean,
): SubscriptionAccessDecision {
  if (!stripeConfigured) {
    return { allowed: true };
  }

  if (!subscription) {
    return { allowed: false, reason: 'SUBSCRIPTION_FROZEN', message: 'No active subscription found.' };
  }

  switch (subscription.status) {
    case SubscriptionStatus.TRIALING:
      if (subscription.trial_end && subscription.trial_end.getTime() > now) {
        return { allowed: true };
      }
      return {
        allowed: false,
        reason: 'TRIAL_EXPIRED',
        message: 'Your trial has expired. Please choose a plan to continue.',
      };

    case SubscriptionStatus.ACTIVE:
      return { allowed: true };

    case SubscriptionStatus.PAST_DUE: {
      const freezeEffectiveAt = computeFreezeEffectiveAt(subscription);
      if (freezeEffectiveAt && now < freezeEffectiveAt) {
        return { allowed: true };
      }
      return {
        allowed: false,
        reason: 'SUBSCRIPTION_FROZEN',
        message: 'Your subscription is frozen due to an overdue payment.',
      };
    }

    default:
      return { allowed: false, reason: 'SUBSCRIPTION_FROZEN', message: 'Your subscription is not active.' };
  }
}
