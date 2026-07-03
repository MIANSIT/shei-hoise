import { supabaseAdmin } from "@/lib/supabase/admin";
import type { FeatureCheckable } from "./planFeatures";

/** Server-only (service-role client). Shared by CAPI sending and plan-limit checks. */
export async function getStoreFeatureSubscription(storeId: string): Promise<FeatureCheckable | null> {
  const { data } = await supabaseAdmin
    .from("store_subscriptions")
    .select("status, subscription_plans (features, limits)")
    .eq("store_id", storeId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return null;
  const plan = data.subscription_plans as { features?: Record<string, unknown>; limits?: Record<string, unknown> } | null;
  return {
    status: data.status as string,
    plan: plan ? { features: plan.features, limits: plan.limits } : null,
  };
}
