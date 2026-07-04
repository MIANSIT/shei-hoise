"use server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function deleteOrder(
  orderId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: order, error: fetchError } = await supabaseAdmin
      .from("orders")
      .select("id, order_number")
      .eq("id", orderId)
      .single();

    if (fetchError || !order) return { success: false, error: "Order not found" };

    const { error: itemsError } = await supabaseAdmin
      .from("order_items")
      .delete()
      .eq("order_id", orderId);
    if (itemsError) return { success: false, error: "Failed to delete order items" };

    const { error: deleteError } = await supabaseAdmin
      .from("orders")
      .delete()
      .eq("id", orderId);
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
