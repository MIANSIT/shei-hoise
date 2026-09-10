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
    .select("delivered_orders, cancelled_orders, returned_orders")
    .eq("phone_number", phoneNumber)
    .maybeSingle();

  if (!profile) return { level: "new", reason: "First order from this number" };

  const returnedOrders = profile.returned_orders ?? 0;
  // Cancelled (never accepted the delivery) and returned (accepted it, then
  // sent it back) are different behaviors, tracked in separate columns — but
  // both are still "didn't end up keeping the order", so both count toward
  // the risk rate/threshold the same way. Only the reason text distinguishes
  // them, so an admin can tell which pattern they're actually looking at.
  const badOutcomes = profile.cancelled_orders + returnedOrders;
  const resolved = profile.delivered_orders + badOutcomes;
  if (resolved === 0) return { level: "new", reason: "No completed orders yet" };

  const cancellationRate = badOutcomes / resolved;

  const { count: distinctStores } = await supabaseAdmin
    .from("customer_risk_store_touches")
    .select("store_id", { count: "exact", head: true })
    .eq("phone_number", phoneNumber);

  const storeCount = distinctStores ?? 0;

  // "3 cancelled, 1 returned of 8 past orders" — omits whichever of the two
  // is zero instead of always naming both.
  const badOutcomeDetail = [
    profile.cancelled_orders > 0 ? `${profile.cancelled_orders} cancelled` : null,
    returnedOrders > 0 ? `${returnedOrders} returned` : null,
  ]
    .filter(Boolean)
    .join(", ");

  if (cancellationRate > 0.5 || (badOutcomes >= 3 && storeCount >= 2)) {
    return {
      level: "high",
      reason:
        `${badOutcomeDetail} of ${resolved} past orders` +
        (storeCount >= 2 ? ` across ${storeCount} different stores` : ""),
    };
  }

  if (cancellationRate >= 0.2) {
    return {
      level: "medium",
      reason: `${badOutcomeDetail} of ${resolved} past orders`,
    };
  }

  return {
    level: "low",
    reason: `${profile.delivered_orders} of ${resolved} past orders delivered successfully`,
  };
}

/** Feeds an order's final outcome (delivered/cancelled/returned) back into the phone's risk profile. */
export async function recordOrderOutcome(
  phoneNumber: string | null | undefined,
  storeId: string,
  outcome: "delivered" | "cancelled" | "returned",
): Promise<void> {
  if (!phoneNumber) return;

  const { data: existing } = await supabaseAdmin
    .from("customer_risk_profiles")
    .select("total_orders, delivered_orders, cancelled_orders, returned_orders")
    .eq("phone_number", phoneNumber)
    .maybeSingle();

  await supabaseAdmin.from("customer_risk_profiles").upsert(
    {
      phone_number: phoneNumber,
      total_orders: (existing?.total_orders ?? 0) + 1,
      delivered_orders: (existing?.delivered_orders ?? 0) + (outcome === "delivered" ? 1 : 0),
      cancelled_orders: (existing?.cancelled_orders ?? 0) + (outcome === "cancelled" ? 1 : 0),
      returned_orders: (existing?.returned_orders ?? 0) + (outcome === "returned" ? 1 : 0),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "phone_number" },
  );

  await supabaseAdmin
    .from("customer_risk_store_touches")
    .upsert({ phone_number: phoneNumber, store_id: storeId }, { onConflict: "phone_number,store_id", ignoreDuplicates: true });
}
