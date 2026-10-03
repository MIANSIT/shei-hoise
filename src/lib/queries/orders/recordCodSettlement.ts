"use server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { BRANCH_SCOPE_ERROR, canUseBranch, getAuthorizedStoreId, logActivity } from "@/lib/permissions/server";

export interface RecordCodSettlementInput {
  settlementDate: string; // YYYY-MM-DD
  courier?: string | null;
  /** What the courier actually paid out — can differ slightly from the sum of order totals if they deduct fees. */
  totalAmount: number;
  orderIds: string[];
  note?: string | null;
}

/**
 * Records one courier payout covering several delivered COD orders at once,
 * and marks every covered order as settled so it's never counted again in a
 * later payout. orderIds is re-verified against the caller's own store and
 * against cod_settlement_id still being null — a client-supplied id list is
 * never trusted outright (e.g. a stale page, or two settlements submitted
 * from two tabs at once would otherwise double-count an order).
 */
export async function recordCodSettlement(
  input: RecordCodSettlementInput,
): Promise<string> {
  if (!input.orderIds?.length) {
    throw new Error("Select at least one order to settle");
  }
  if (!(input.totalAmount > 0)) {
    throw new Error("Enter the amount actually received");
  }

  const storeResult = await getAuthorizedStoreId("cod.add");
  if (!storeResult.ok) throw new Error(storeResult.error);
  const storeId = storeResult.storeId;

  const { data: eligibleOrders, error: fetchError } = await supabaseAdmin
    .from("orders")
    .select("*")
    .eq("store_id", storeId)
    .in("id", input.orderIds)
    .is("cod_settlement_id", null);

  if (fetchError) throw new Error(fetchError.message);

  const eligible = (eligibleOrders ?? []) as { id: string; branch_id?: string | null }[];
  const eligibleIds = eligible.map((o) => o.id);
  if (eligibleIds.length === 0) {
    throw new Error("None of the selected orders are still eligible for settlement");
  }

  // Stores with branches: one payout lands in one branch's drawer.
  const branchIds = new Set(eligible.map((o) => o.branch_id ?? null));
  if (branchIds.size > 1) {
    throw new Error("Pick orders from one branch — each settlement goes into one branch's cash.");
  }
  const branchId = [...branchIds][0] ?? null;
  if (branchId && !canUseBranch(storeResult.actor, branchId)) throw new Error(BRANCH_SCOPE_ERROR);

  const { data: settlement, error: insertError } = await supabaseAdmin
    .from("store_cod_settlements")
    .insert({
      store_id: storeId,
      courier: input.courier || null,
      settlement_date: input.settlementDate,
      total_amount: input.totalAmount,
      order_count: eligibleIds.length,
      note: input.note || null,
      ...(branchId ? { branch_id: branchId } : {}),
    })
    .select("id")
    .single();

  if (insertError) throw new Error(insertError.message);

  // Handing the cash over is what makes a delivered COD order paid — without
  // this the customer stayed "owing" the full total (courier charge included)
  // in Customer Dues and the order never counted as paid revenue, even though
  // the courier had already collected it.
  const { error: updateError } = await supabaseAdmin
    .from("orders")
    .update({ cod_settlement_id: settlement.id, payment_status: "paid" })
    .eq("store_id", storeId)
    .in("id", eligibleIds);

  if (updateError) {
    // Roll back the settlement row rather than leave an orphaned batch with
    // no orders attached to it.
    await supabaseAdmin.from("store_cod_settlements").delete().eq("id", settlement.id);
    throw new Error(updateError.message);
  }

  await logActivity(storeResult.actor, {
    action: "cod.add",
    entityType: "cod_settlement",
    entityId: settlement.id as string,
    branchId,
    summary: `Recorded COD settlement of ৳${input.totalAmount} for ${eligibleIds.length} orders`,
  });

  return settlement.id as string;
}
