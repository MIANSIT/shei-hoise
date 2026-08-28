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

// Updates a draft vendor order — replaces all line items and recomputes
// totals via the update_vendor_order_draft RPC, which locks the order row
// (FOR UPDATE) and re-checks draft status inside that lock before touching
// anything. Doing this as a single atomic transaction (rather than a
// separate read-check + update + delete + insert from here) is what keeps
// it correctly serialized against confirm_vendor_order's own lock on the
// same row — see supabase/migrations/20260823000002_add_update_vendor_order_draft_rpc.sql.
export async function updateVendorOrder(
  input: UpdateVendorOrderInput,
): Promise<void> {
  if (!input.items?.length) {
    throw new Error("At least one product is required");
  }

  const { error } = await supabaseAdmin.rpc("update_vendor_order_draft", {
    p_order_id: input.order_id,
    p_store_id: input.store_id,
    p_order_date: input.order_date,
    p_invoice_date: input.invoice_date || null,
    p_delivery_date: input.delivery_date || null,
    p_delivery_person: input.delivery_person || null,
    p_vehicle_number: input.vehicle_number || null,
    p_reference_number: input.reference_number || null,
    p_notes: input.notes || null,
    p_delivery_cost: input.delivery_cost ?? 0,
    p_discount_amount: input.discount_amount ?? 0,
    p_paid_amount: input.paid_amount ?? 0,
    p_items: input.items.map((item) => ({
      product_id: item.product_id,
      variant_id: item.variant_id,
      product_name: item.product_name,
      sku: item.sku,
      quantity: item.quantity,
      original_tp: item.original_tp,
      increase_percent: item.increase_percent,
      vendor_tp: item.vendor_tp,
      mrp: item.mrp,
    })),
  });

  if (error) throw new Error(error.message);
}
