"use server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getAuthenticatedStoreId } from "@/lib/utils/getAuthenticatedStoreId";

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

  const storeResult = await getAuthenticatedStoreId();
  if (!storeResult.ok) throw new Error(storeResult.error);
  const storeId = storeResult.storeId;

  const { data: eligibleOrders, error: fetchError } = await supabaseAdmin
    .from("orders")
    .select("id")
    .eq("store_id", storeId)
    .in("id", input.orderIds)
    .is("cod_settlement_id", null);

  if (fetchError) throw new Error(fetchError.message);

  const eligibleIds = (eligibleOrders ?? []).map((o) => o.id as string);
  if (eligibleIds.length === 0) {
    throw new Error("None of the selected orders are still eligible for settlement");
  }

  const { data: settlement, error: insertError } = await supabaseAdmin
    .from("store_cod_settlements")
    .insert({
      store_id: storeId,
      courier: input.courier || null,
      settlement_date: input.settlementDate,
      total_amount: input.totalAmount,
      order_count: eligibleIds.length,
      note: input.note || null,
    })
    .select("id")
    .single();

  if (insertError) throw new Error(insertError.message);

  const { error: updateError } = await supabaseAdmin
    .from("orders")
    .update({ cod_settlement_id: settlement.id })
    .eq("store_id", storeId)
    .in("id", eligibleIds);

  if (updateError) {
    // Roll back the settlement row rather than leave an orphaned batch with
    // no orders attached to it.
    await supabaseAdmin.from("store_cod_settlements").delete().eq("id", settlement.id);
    throw new Error(updateError.message);
  }

  return settlement.id as string;
}
