import { NextRequest } from "next/server";
import { getPhoneDeliveryStats } from "@/lib/utils/riskScoring";

/**
 * On-demand "Check Delivery History" lookup for a single phone number, used
 * by the Customer Info panel on Create/Edit Order. Unlike the risk-levels
 * batch endpoint (fire-and-forget, once per orders-table page load), this is
 * called explicitly by an admin clicking the button, so it stays a single-
 * phone POST rather than a batch.
 *
 * No storeId/auth scoping — same as /api/orders/risk-levels, this reads
 * customer_risk_profiles, which is deliberately cross-store by design (see
 * riskScoring.ts), not per-tenant data.
 */
export async function POST(req: NextRequest) {
  try {
    const { phone } = await req.json().catch(() => ({}));

    if (typeof phone !== "string" || !phone.trim()) {
      return Response.json({ error: "A valid phone number is required" }, { status: 400 });
    }

    const stats = await getPhoneDeliveryStats(phone.trim());
    return Response.json({ stats }, { status: 200 });
  } catch (error) {
    console.error("[delivery-history] failed:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
