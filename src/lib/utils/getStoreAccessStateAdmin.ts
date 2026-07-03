import { supabaseAdmin } from "@/lib/supabase/admin";
import { getSubscriptionAccessState, type SubscriptionAccess } from "./subscriptionAccess";

/**
 * Server-only (uses the service-role client — an anonymous storefront visitor
 * has no RLS access to store_subscriptions). Used to decide whether the
 * storefront itself should render, independent of the owner's dashboard lock.
 */
export async function getStoreAccessStateAdmin(storeId: string): Promise<SubscriptionAccess> {
  const { data } = await supabaseAdmin
    .from("store_subscriptions")
    .select("status, trial_ends_at, current_period_end")
    .eq("store_id", storeId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return getSubscriptionAccessState(data);
}
