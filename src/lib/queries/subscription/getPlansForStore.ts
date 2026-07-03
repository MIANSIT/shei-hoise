import { supabase } from "@/lib/supabase";
import { PLAN_COLUMNS, type PublicPlan } from "./getPublicPlans";

/**
 * Fetch plans based on role + current plan visibility rules:
 * - super_admin → all active plans
 * - store_owner → public active plans + their own plan (even if non-public)
 */
export async function getPlansForStore(
  role: string,
  currentPlanId?: string | null,
): Promise<PublicPlan[]> {
  if (role === "super_admin") {
    const { data, error } = await supabase
      .from("subscription_plans")
      .select(PLAN_COLUMNS)
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (error || !data) return [];
    return data as PublicPlan[];
  }

  const { data: publicData, error: publicErr } = await supabase
    .from("subscription_plans")
    .select(PLAN_COLUMNS)
    .eq("is_public", true)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (publicErr || !publicData) return [];

  const plans = publicData as PublicPlan[];

  if (!currentPlanId) return plans;

  const alreadyIncluded = plans.some((p) => p.id === currentPlanId);
  if (alreadyIncluded) return plans;

  // The plan may no longer be public (is_public only controls discoverability,
  // not access), so it's fetched via the admin-backed route rather than the
  // RLS-bound client, which would otherwise silently return nothing for it.
  const res = await fetch("/api/subscription/current-plan");
  if (res.ok) {
    const currentPlanData = await res.json();
    if (currentPlanData && currentPlanData.id === currentPlanId) {
      return [...plans, currentPlanData as PublicPlan];
    }
  }

  return plans;
}
