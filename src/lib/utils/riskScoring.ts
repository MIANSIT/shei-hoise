import { supabaseAdmin } from "@/lib/supabase/admin";

export type RiskLevel = "new" | "low" | "medium" | "high";

export interface RiskAssessment {
  level: RiskLevel;
  reason: string;
}

export interface PhoneDeliveryStats {
  totalOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  returnedOrders: number;
  resolvedOrders: number;
  /** deliveredOrders / resolvedOrders * 100, rounded to 1 decimal. 0 when resolvedOrders is 0 — always computed here, never trusted from elsewhere. */
  successRate: number;
  storeCount: number;
  level: RiskLevel;
}

/**
 * Raw delivered/cancelled/returned counts behind getPhoneRiskLevel's verdict,
 * for surfaces that want to show the numbers themselves (e.g. the "Check
 * Delivery History" panel) instead of just a level + one-line reason. Reads
 * the same cross-store tables — see getPhoneRiskLevel's own note. Returns
 * null for a number with no profile yet (never ordered before, anywhere on
 * the platform), which callers should treat as "new customer," not an error.
 */
export async function getPhoneDeliveryStats(
  phoneNumber: string | null | undefined,
): Promise<PhoneDeliveryStats | null> {
  if (!phoneNumber) return null;

  const { data: profile } = await supabaseAdmin
    .from("customer_risk_profiles")
    .select("total_orders, delivered_orders, cancelled_orders, returned_orders")
    .eq("phone_number", phoneNumber)
    .maybeSingle();

  if (!profile) return null;

  const deliveredOrders = profile.delivered_orders ?? 0;
  const cancelledOrders = profile.cancelled_orders ?? 0;
  const returnedOrders = profile.returned_orders ?? 0;
  const badOutcomes = cancelledOrders + returnedOrders;
  const resolvedOrders = deliveredOrders + badOutcomes;

  const { count: distinctStores } = await supabaseAdmin
    .from("customer_risk_store_touches")
    .select("store_id", { count: "exact", head: true })
    .eq("phone_number", phoneNumber);
  const storeCount = distinctStores ?? 0;

  const cancellationRate = resolvedOrders > 0 ? badOutcomes / resolvedOrders : 0;
  const level: RiskLevel =
    resolvedOrders === 0
      ? "new"
      : cancellationRate > 0.5 || (badOutcomes >= 3 && storeCount >= 2)
        ? "high"
        : cancellationRate >= 0.2
          ? "medium"
          : "low";

  return {
    totalOrders: profile.total_orders ?? resolvedOrders,
    deliveredOrders,
    cancelledOrders,
    returnedOrders,
    resolvedOrders,
    successRate: resolvedOrders > 0 ? Math.round((deliveredOrders / resolvedOrders) * 1000) / 10 : 0,
    storeCount,
    level,
  };
}

/**
 * Cross-store phone-number risk assessment for COD orders. Deliberately reads
 * from customer_risk_profiles / customer_risk_store_touches, which pool data
 * across every store on the platform, not just the current one.
 */
export async function getPhoneRiskLevel(phoneNumber: string | null | undefined): Promise<RiskAssessment> {
  if (!phoneNumber) return { level: "new", reason: "No phone number on file" };

  const stats = await getPhoneDeliveryStats(phoneNumber);
  if (!stats) return { level: "new", reason: "First order from this number" };
  if (stats.resolvedOrders === 0) return { level: "new", reason: "No completed orders yet" };

  // "3 cancelled, 1 returned of 8 past orders" — omits whichever of the two
  // is zero instead of always naming both.
  const badOutcomeDetail = [
    stats.cancelledOrders > 0 ? `${stats.cancelledOrders} cancelled` : null,
    stats.returnedOrders > 0 ? `${stats.returnedOrders} returned` : null,
  ]
    .filter(Boolean)
    .join(", ");

  if (stats.level === "high") {
    return {
      level: "high",
      reason:
        `${badOutcomeDetail} of ${stats.resolvedOrders} past orders` +
        (stats.storeCount >= 2 ? ` across ${stats.storeCount} different stores` : ""),
    };
  }

  if (stats.level === "medium") {
    return {
      level: "medium",
      reason: `${badOutcomeDetail} of ${stats.resolvedOrders} past orders`,
    };
  }

  return {
    level: "low",
    reason: `${stats.deliveredOrders} of ${stats.resolvedOrders} past orders delivered successfully`,
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
