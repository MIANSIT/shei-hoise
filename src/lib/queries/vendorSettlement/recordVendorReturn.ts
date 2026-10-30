"use server";
import type { RecordVendorReturnInput } from "@/lib/types/vendor/type";
import { BRANCH_SCOPE_ERROR, canUseBranch, getAuthorizedStoreId, logActivity } from "@/lib/permissions/server";
import { callVendorRpc } from "@/lib/queries/vendor/vendorBranchRpc";

// Goods a vendor brings back after they were already settled as sold: they go
// back into stock, and the vendor gets a credit for them (an optional refund
// pays part or all of that credit out now). Atomic via the record_vendor_return
// RPC. See supabase/migrations/20261106000000_vendor_returns_after_settlement.sql.
export async function recordVendorReturn(input: RecordVendorReturnInput): Promise<string> {
  if (!input.items?.length) {
    throw new Error("Choose at least one product to return");
  }

  // The store always comes from the session, never from the caller.
  const storeResult = await getAuthorizedStoreId("vendors.add");
  if (!storeResult.ok) throw new Error(storeResult.error);
  if (input.branch_id && !canUseBranch(storeResult.actor, input.branch_id)) {
    throw new Error(BRANCH_SCOPE_ERROR);
  }

  const { data, error } = await callVendorRpc<string>(
    "record_vendor_return",
    {
      p_vendor_id: input.vendor_id,
      p_store_id: storeResult.storeId,
      p_return_date: input.return_date,
      p_items: input.items.map((item) => ({
        product_id: item.product_id,
        variant_id: item.variant_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
      })),
      p_refund_amount: input.refund_amount ?? 0,
      p_notes: input.notes || null,
      p_created_by: input.created_by || null,
      p_payment_method: input.refund_method ?? "cash",
    },
    { p_branch_id: input.branch_id || null },
  );

  if (error) {
    // The migration isn't in the database yet: say so plainly instead of a raw function error.
    if (error.code === "PGRST202") {
      throw new Error("Vendor returns are not set up yet. Apply the vendor returns update to the database first.");
    }
    throw new Error(error.message);
  }

  await logActivity(storeResult.actor, {
    action: "vendors.add",
    entityType: "vendor_return",
    entityId: (data as string) ?? null,
    summary: `Vendor return recorded (${input.items.length} product${input.items.length === 1 ? "" : "s"})`,
  });

  return data as string;
}
