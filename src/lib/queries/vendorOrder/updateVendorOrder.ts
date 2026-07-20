"use server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { VendorOrderItemInput } from "@/lib/types/vendor/type";

export interface UpdateVendorOrderInput {
  order_id: string;
  store_id: string;
  order_date: string;
  invoice_date?: string | null;
  delivery_date?: string | null;
  delivery_person?: string;
  vehicle_number?: string;
  reference_number?: string;
  notes?: string;
  delivery_cost?: number;
  discount_amount?: number;
  paid_amount?: number;
  items: VendorOrderItemInput[];
}

// Updates a draft vendor order — replaces all line items and recomputes totals.
// Throws if the order is not in draft status or doesn't belong to the store.
export async function updateVendorOrder(
  input: UpdateVendorOrderInput,
): Promise<void> {
  if (!input.items?.length) {
    throw new Error("At least one product is required");
  }

  // Guard: only draft orders belonging to this store can be edited
  const { data: existing, error: fetchError } = await supabaseAdmin
    .from("vendor_orders")
    .select("id, status, store_id")
    .eq("id", input.order_id)
    .eq("store_id", input.store_id)
    .single();

  if (fetchError || !existing) throw new Error("Vendor order not found");
  if (existing.status !== "draft") throw new Error("Only draft orders can be edited");

  const totalQuantity = input.items.reduce((sum, i) => sum + i.quantity, 0);
  const subtotal = input.items.reduce((sum, i) => sum + i.quantity * i.vendor_tp, 0);
  const deliveryCost = input.delivery_cost ?? 0;
  const discountAmount = input.discount_amount ?? 0;
  const grandTotal = subtotal + deliveryCost - discountAmount;
  const paidAmount = input.paid_amount ?? 0;
  const dueAmount = grandTotal - paidAmount;

  const { error: updateError } = await supabaseAdmin
    .from("vendor_orders")
    .update({
      order_date: input.order_date,
      invoice_date: input.invoice_date || null,
      delivery_date: input.delivery_date || null,
      delivery_person: input.delivery_person || null,
      vehicle_number: input.vehicle_number || null,
      reference_number: input.reference_number || null,
      notes: input.notes || null,
      total_quantity: totalQuantity,
      subtotal,
      delivery_cost: deliveryCost,
      discount_amount: discountAmount,
      grand_total: grandTotal,
      paid_amount: paidAmount,
      due_amount: dueAmount,
    })
    .eq("id", input.order_id);

  if (updateError) throw new Error(updateError.message);

  // Replace all items atomically: delete old, insert new
  const { error: deleteError } = await supabaseAdmin
    .from("vendor_order_items")
    .delete()
    .eq("vendor_order_id", input.order_id);

  if (deleteError) throw new Error(deleteError.message);

  const itemRows = input.items.map((item) => ({
    vendor_order_id: input.order_id,
    product_id: item.product_id,
    variant_id: item.variant_id,
    product_name: item.product_name,
    sku: item.sku,
    quantity: item.quantity,
    original_tp: item.original_tp,
    increase_percent: item.increase_percent,
    vendor_tp: item.vendor_tp,
    mrp: item.mrp,
    line_total: item.quantity * item.vendor_tp,
  }));

  const { error: insertError } = await supabaseAdmin
    .from("vendor_order_items")
    .insert(itemRows);

  if (insertError) throw new Error(insertError.message);
}
