export const GRACE_PERIOD_DAYS = 3;

export type SubscriptionAccessState = "open" | "grace" | "locked";

export interface SubscriptionAccess {
  state: SubscriptionAccessState;
  daysLeftInGrace?: number;
}

export interface AccessCheckable {
  status: string;
  trial_ends_at?: string | null;
  current_period_end?: string | null;
}

// Only these statuses can ever grant access, and only for as long as their
// period hasn't lapsed (past the grace period below). Every other status
// (canceled, expired, paused, incomplete, or anything unrecognized) means no
// paid/trial access exists right now, so it locks immediately — there is no
// period to grace-period from.
const ENTITLED_STATUSES = new Set(["active", "trialing", "past_due"]);

/**
 * Computed lazily on every read — there is no cron in this project to flip
 * statuses on a schedule. A missing subscription record is always treated as
 * "open": every store created before this feature shipped has no
 * store_subscriptions row at all, and must never be locked out because of
 * that. Only a subscription that actually exists and has genuinely lapsed
 * past its grace period gets locked.
 */
export function getSubscriptionAccessState(subscription: AccessCheckable | null): SubscriptionAccess {
  if (!subscription) return { state: "open" };

  if (!ENTITLED_STATUSES.has(subscription.status)) return { state: "locked" };

  const periodEnd = subscription.trial_ends_at ?? subscription.current_period_end;
  if (!periodEnd) return { state: "open" };

  const endMs = new Date(periodEnd).getTime();
  const nowMs = Date.now();
  if (nowMs <= endMs) return { state: "open" };

  const graceEndMs = endMs + GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000;
  if (nowMs <= graceEndMs) {
    const daysLeftInGrace = Math.max(1, Math.ceil((graceEndMs - nowMs) / (24 * 60 * 60 * 1000)));
    return { state: "grace", daysLeftInGrace };
  }

  return { state: "locked" };
}
