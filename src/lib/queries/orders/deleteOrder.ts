"use server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getAuthenticatedStoreId } from "@/lib/utils/getAuthenticatedStoreId";
import { OrderStatus } from "@/lib/types/enums";

// Statuses whose stock still sits in quantity_reserved (order creation
// reserves it immediately, regardless of payment status — see
// orderService.ts). Deleting one of these orders outright used to be
// blocked in the UI specifically so the reservation wouldn't be orphaned
// forever with no order left to ever release it; releasing it here instead
// means the UI no longer has to force a cancel step first.
const RESERVED_STATUSES: string[] = [
  OrderStatus.PENDING,
  OrderStatus.CONFIRMED,
  OrderStatus.SHIPPED,
];

interface ReleasableOrderItem {
  product_id: string;
  variant_id: string | null;
  quantity: number;
  // PostgREST embeds a to-one relation as a single object at runtime, but
  // without a generated Database type this client infers it as an array —
  // asserted below rather than typed `any`.
  products: { product_type: string } | null;
}

async function releaseReservedStock(orderId: string): Promise<void> {
  const { data: items } = await supabaseAdmin
    .from("order_items")
    .select("product_id, variant_id, quantity, products(product_type)")
    .eq("order_id", orderId);

  // Bundle header rows carry no product_inventory of their own — the real
  // stock lives on their exploded component rows.
  const stockItems = ((items as unknown as ReleasableOrderItem[]) || []).filter(
    (item) => item.products?.product_type !== "bundle",
  );

  for (const item of stockItems) {
    const inventoryQuery = item.variant_id
      ? supabaseAdmin
          .from("product_inventory")
          .select("quantity_available, quantity_reserved")
          .eq("variant_id", item.variant_id)
          .single()
      : supabaseAdmin
          .from("product_inventory")
          .select("quantity_available, quantity_reserved")
          .eq("product_id", item.product_id)
          .is("variant_id", null)
          .single();

    const { data: inventory } = await inventoryQuery;
    if (!inventory) continue;

    const updatePayload = {
      quantity_available: (inventory.quantity_available || 0) + item.quantity,
      quantity_reserved: Math.max(0, (inventory.quantity_reserved || 0) - item.quantity),
    };

    if (item.variant_id) {
      await supabaseAdmin
        .from("product_inventory")
        .update(updatePayload)
        .eq("variant_id", item.variant_id);
    } else {
      await supabaseAdmin
        .from("product_inventory")
        .update(updatePayload)
        .eq("product_id", item.product_id)
        .is("variant_id", null);
    }
  }
}

export async function deleteOrder(
  orderId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const storeResult = await getAuthenticatedStoreId();
    if (!storeResult.ok) {
      return { success: false, error: storeResult.error };
    }

    const { data: order, error: fetchError } = await supabaseAdmin
      .from("orders")
      .select("id, order_number, status")
      .eq("id", orderId)
      .eq("store_id", storeResult.storeId)
      .single();

    if (fetchError || !order) return { success: false, error: "Order not found" };

    if (RESERVED_STATUSES.includes(order.status)) {
      await releaseReservedStock(orderId);
    }

    const { error: itemsError } = await supabaseAdmin
      .from("order_items")
      .delete()
      .eq("order_id", orderId);
    if (itemsError) return { success: false, error: "Failed to delete order items" };

    const { error: deleteError } = await supabaseAdmin
      .from("orders")
      .delete()
      .eq("id", orderId)
      .eq("store_id", storeResult.storeId);
    if (deleteError) return { success: false, error: "Failed to delete order" };

    return { success: true };
  } catch (error) {
    console.error("Error in deleteOrder:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}
