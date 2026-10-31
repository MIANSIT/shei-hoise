import { getStoreFeatureSubscription } from "@/lib/utils/getStoreFeatureSubscription";
import { hasFeature } from "@/lib/utils/planFeatures";

// Server-only. Memberships are a plan feature: a store whose plan does not
// include it behaves exactly as it did before memberships existed (no member
// discount, no automatic memberships, no welcome emails), even if it has
// memberships saved from an earlier plan.

export const MEMBERSHIP_FEATURE = "customer_membership";

const CACHE_MS = 60_000;
const cache = new Map<string, { enabled: boolean; at: number }>();

/**
 * Whether this store's plan (active or trialing) includes memberships.
 * Remembered for a minute per store, because it is asked on every order.
 */
export async function membershipFeatureEnabled(storeId: string): Promise<boolean> {
  const now = Date.now();
  const hit = cache.get(storeId);
  if (hit && now - hit.at < CACHE_MS) return hit.enabled;

  let enabled = false;
  try {
    enabled = hasFeature(await getStoreFeatureSubscription(storeId), MEMBERSHIP_FEATURE);
  } catch (error) {
    console.error("membershipFeatureEnabled failed:", error);
    return false;
  }
  cache.set(storeId, { enabled, at: now });
  return enabled;
}
