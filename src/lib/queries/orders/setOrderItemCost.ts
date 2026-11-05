"use server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { BRANCH_SCOPE_ERROR, canUseBranch, getAuthorizedStoreId, logActivity } from "@/lib/permissions/server";

/**
 * Sets the cost (TP) of one sold order line, for a line that was saved with no cost. The order's profit is then
 * worked out with it. A month that is closed locks the order's lines in the database.
 * @returns ok, or why it failed
 */
export async function setOrderItemCost(orderItemId: string, cost: number): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    if (!Number.isFinite(cost) || cost <= 0 || cost > 1_000_000_000) return { ok: false, error: "Enter a cost above zero" };
    const auth = await getAuthorizedStoreId("orders.edit");
    if (!auth.ok) return { ok: false, error: auth.error };

    const { data: item } = await supabaseAdmin
      .from("order_items")
      .select("id, product_name, order:orders!inner(store_id, branch_id, order_number)")
      .eq("id", orderItemId)
      .maybeSingle();
    const order = (item?.order as unknown as { store_id: string; branch_id: string | null; order_number: string } | null) ?? null;
    if (!item || !order || order.store_id !== auth.storeId) return { ok: false, error: "Order line not found" };
    if (order.branch_id && !canUseBranch(auth.actor, order.branch_id)) return { ok: false, error: BRANCH_SCOPE_ERROR };

    const { error } = await supabaseAdmin.from("order_items").update({ cost_price: Math.round(cost * 100) / 100 }).eq("id", orderItemId);
    if (error) return { ok: false, error: error.message };

    await logActivity(auth.actor, {
      action: "orders.edit",
      branchId: order.branch_id,
      entityType: "order_item",
      entityId: orderItemId,
      summary: `Set the cost of ${item.product_name} on order ${order.order_number} to ৳${cost}`,
    });
    return { ok: true };
  } catch (err) {
    console.error("setOrderItemCost failed:", err);
    return { ok: false, error: err instanceof Error ? err.message : "Failed to save the cost" };
  }
}
