"use server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getAuthenticatedStoreId } from "@/lib/utils/getAuthenticatedStoreId";
import type { RecordVendorSettlementInput } from "@/lib/types/vendor/type";

// Records a settlement visit atomically via the record_vendor_settlement RPC
// — decrements vendor stock, auto-returns any returned_quantity back into
// warehouse stock, and logs an optional payment, all in one transaction.
// See supabase/migrations/20260711000000_add_vendor_distribution_module.sql.
export async function recordVendorSettlement(
  input: RecordVendorSettlementInput,
): Promise<string> {
  if (!input.items?.length) {
    throw new Error("At least one settlement item is required");
  }

  // input.store_id is caller-supplied — never trust it for authorization.
  // Always settle against the session's own store, and the RPC itself
  // separately verifies the vendor belongs to that store.
  const storeResult = await getAuthenticatedStoreId();
  if (!storeResult.ok) throw new Error(storeResult.error);

  const { data, error } = await supabaseAdmin.rpc("record_vendor_settlement", {
    p_vendor_id: input.vendor_id,
    p_store_id: storeResult.storeId,
    p_settlement_date: input.settlement_date,
    p_items: input.items.map((item) => ({
      product_id: item.product_id,
      variant_id: item.variant_id,
      sold_quantity: item.sold_quantity,
      returned_quantity: item.returned_quantity,
      unit_price: item.unit_price,
    })),
    p_payment_amount: input.payment_amount ?? 0,
    p_notes: input.notes || null,
    p_created_by: input.created_by || null,
    p_payment_method: input.payment_method ?? "cash",
  });

  if (error) {
    throw new Error(error.message);
  }

  return data as string;
}
