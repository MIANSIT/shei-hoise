"use server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { VendorActionResult } from "@/lib/types/vendor/type";
import { BRANCH_SCOPE_ERROR, canUseBranch, getAuthorizedStoreId, logActivity } from "@/lib/permissions/server";

const round2 = (v: number): number => Math.round(v * 100) / 100;

/**
 * Sets the delivery charge on a vendor order that is already confirmed, and brings its grand total in line
 * (items + delivery - discount). Delivery is billed to the vendor, so it is part of what the vendor owes: the
 * vendor's due and the invoice balance follow from the order. A month that is closed locks the order in the database.
 * @returns ok, or why it failed
 */
export async function updateVendorOrderDelivery(vendorOrderId: string, deliveryCost: number): Promise<VendorActionResult> {
  try {
    if (!Number.isFinite(deliveryCost) || deliveryCost < 0 || deliveryCost > 1_000_000_000) {
      return { ok: false, error: "Enter a delivery charge of zero or more" };
    }
    const auth = await getAuthorizedStoreId("vendors.edit");
    if (!auth.ok) return { ok: false, error: auth.error };

    const { data: order } = await supabaseAdmin
      .from("vendor_orders")
      .select("id, store_id, status, branch_id, subtotal, discount_amount, delivery_cost, invoice_number")
      .eq("id", vendorOrderId)
      .eq("store_id", auth.storeId)
      .maybeSingle();
    if (!order) return { ok: false, error: "Vendor order not found" };
    if (order.status !== "confirmed") return { ok: false, error: "Only a confirmed order can change its delivery charge here" };
    if (order.branch_id && !canUseBranch(auth.actor, order.branch_id as string)) return { ok: false, error: BRANCH_SCOPE_ERROR };

    const delivery = round2(deliveryCost);
    const grandTotal = round2(Number(order.subtotal) + delivery - Number(order.discount_amount));
    if (grandTotal < 0) return { ok: false, error: "The discount is more than the order total" };

    const { error } = await supabaseAdmin
      .from("vendor_orders")
      .update({ delivery_cost: delivery, grand_total: grandTotal, updated_at: new Date().toISOString() })
      .eq("id", vendorOrderId)
      .eq("store_id", auth.storeId);
    if (error) return { ok: false, error: error.message };

    await logActivity(auth.actor, {
      action: "vendors.edit",
      branchId: (order.branch_id as string | null) ?? null,
      entityType: "vendor_order",
      entityId: vendorOrderId,
      summary: `Changed the delivery charge of ${order.invoice_number} from ৳${Number(order.delivery_cost)} to ৳${delivery}`,
    });
    return { ok: true, data: undefined };
  } catch (err) {
    console.error("updateVendorOrderDelivery failed:", err);
    return { ok: false, error: err instanceof Error ? err.message : "Failed to change the delivery charge" };
  }
}
