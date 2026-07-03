import { supabaseAdmin } from "@/lib/supabase/admin";

export type RiskLevel = "new" | "low" | "medium" | "high";

export interface RiskAssessment {
  level: RiskLevel;
  reason: string;
}

/**
 * Cross-store phone-number risk assessment for COD orders. Deliberately reads
 * from customer_risk_profiles / customer_risk_store_touches, which pool data
 * across every store on the platform, not just the current one.
 */
export async function getPhoneRiskLevel(phoneNumber: string | null | undefined): Promise<RiskAssessment> {
  if (!phoneNumber) return { level: "new", reason: "No phone number on file" };

  const { data: profile } = await supabaseAdmin
    .from("customer_risk_profiles")
    .select("delivered_orders, cancelled_orders")
    .eq("phone_number", phoneNumber)
    .maybeSingle();

  if (!profile) return { level: "new", reason: "First order from this number" };

  const resolved = profile.delivered_orders + profile.cancelled_orders;
  if (resolved === 0) return { level: "new", reason: "No completed orders yet" };

  const cancellationRate = profile.cancelled_orders / resolved;

  const { count: distinctStores } = await supabaseAdmin
    .from("customer_risk_store_touches")
    .select("store_id", { count: "exact", head: true })
    .eq("phone_number", phoneNumber);

  const storeCount = distinctStores ?? 0;

  if (cancellationRate > 0.5 || (profile.cancelled_orders >= 3 && storeCount >= 2)) {
    return {
      level: "high",
      reason:
        `${profile.cancelled_orders} of ${resolved} past orders cancelled` +
        (storeCount >= 2 ? ` across ${storeCount} different stores` : ""),
    };
  }

  if (cancellationRate >= 0.2) {
    return {
      level: "medium",
      reason: `${profile.cancelled_orders} of ${resolved} past orders cancelled`,
    };
  }

  return {
    level: "low",
    reason: `${profile.delivered_orders} of ${resolved} past orders delivered successfully`,
  };
}

/** Feeds an order's final outcome (delivered/cancelled) back into the phone's risk profile. */
export async function recordOrderOutcome(
  phoneNumber: string | null | undefined,
  storeId: string,
  outcome: "delivered" | "cancelled",
): Promise<void> {
  if (!phoneNumber) return;

  const { data: existing } = await supabaseAdmin
    .from("customer_risk_profiles")
    .select("total_orders, delivered_orders, cancelled_orders")
    .eq("phone_number", phoneNumber)
    .maybeSingle();

  await supabaseAdmin.from("customer_risk_profiles").upsert(
    {
      phone_number: phoneNumber,
      total_orders: (existing?.total_orders ?? 0) + 1,
      delivered_orders: (existing?.delivered_orders ?? 0) + (outcome === "delivered" ? 1 : 0),
      cancelled_orders: (existing?.cancelled_orders ?? 0) + (outcome === "cancelled" ? 1 : 0),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "phone_number" },
  );

  await supabaseAdmin
    .from("customer_risk_store_touches")
    .upsert({ phone_number: phoneNumber, store_id: storeId }, { onConflict: "phone_number,store_id", ignoreDuplicates: true });
}
