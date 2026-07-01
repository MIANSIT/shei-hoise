import { supabase } from "@/lib/supabase";
import type { PublicPlan } from "./getPublicPlans";

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
      .select(
        "id, name, slug, description, price_monthly, price_yearly, currency, features, trial_days, is_featured, sort_order",
      )
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (error || !data) return [];
    return data as PublicPlan[];
  }

  const { data: publicData, error: publicErr } = await supabase
    .from("subscription_plans")
    .select(
      "id, name, slug, description, price_monthly, price_yearly, currency, features, trial_days, is_featured, sort_order",
    )
    .eq("is_public", true)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (publicErr || !publicData) return [];

  const plans = publicData as PublicPlan[];

  if (!currentPlanId) return plans;

  const alreadyIncluded = plans.some((p) => p.id === currentPlanId);
  if (alreadyIncluded) return plans;

  const { data: currentPlanData } = await supabase
    .from("subscription_plans")
    .select(
      "id, name, slug, description, price_monthly, price_yearly, currency, features, trial_days, is_featured, sort_order",
    )
    .eq("id", currentPlanId)
    .eq("is_active", true)
    .maybeSingle();

  if (currentPlanData) {
    return [...plans, currentPlanData as PublicPlan];
  }

  return plans;
}
