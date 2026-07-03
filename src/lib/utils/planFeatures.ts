const ACTIVE_STATUSES = new Set(["active", "trialing"]);

export interface FeatureCheckable {
  status: string;
  plan: {
    features?: Record<string, unknown> | null;
    limits?: Record<string, unknown> | null;
  } | null;
}

/** True only if the subscription is active/trialing AND the plan has this feature flag enabled. */
export function hasFeature(subscription: FeatureCheckable | null, key: string): boolean {
  if (!subscription) return false;
  if (!ACTIVE_STATUSES.has(subscription.status)) return false;
  return subscription.plan?.features?.[key] === true;
}

export interface LimitCheck {
  allowed: boolean;
  limit: number;
  current: number;
}

/**
 * limit === -1 means unlimited. Checks whether `current` usage is still under
 * the plan's limit. No subscription record, or the plan not defining this
 * particular limit key at all, both default to UNLIMITED — a limit is only
 * ever enforced when a plan explicitly sets a numeric value for it. This
 * matters because every store created before this feature shipped has no
 * subscription record, and must never be blocked from normal use by a
 * missing-data default.
 */
export function checkLimit(
  subscription: FeatureCheckable | null,
  key: string,
  current: number,
): LimitCheck {
  const rawLimit = subscription?.plan?.limits?.[key];
  if (typeof rawLimit !== "number") return { allowed: true, limit: -1, current };

  if (rawLimit === -1) return { allowed: true, limit: rawLimit, current };
  return { allowed: current < rawLimit, limit: rawLimit, current };
}
