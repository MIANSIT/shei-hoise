import { supabaseAdmin } from "@/lib/supabase/admin";
import { resolveFunder } from "@/lib/queries/financial/resolveFunder";

/*
 * One supplier payment, checked and ready to save. Used by the payment actions, including a payment
 * split over several lines (some from one branch's money, some from another's, some from an investor).
 * Server-only helper, not a "use server" file, so the browser cannot call it.
 */

export const PAYMENT_METHODS = ["cash", "mobile_banking", "card", "bank_transfer", "online", "other"] as const;
export type PaymentMethodValue = (typeof PAYMENT_METHODS)[number];

/** One part of a payment: how much, from whose money, by which method. */
export interface PaymentLineInput {
  amount: number;
  paymentMethod?: PaymentMethodValue;
  /** "shop" = the shop's own money, "outside" = an investor or the owner's pocket. */
  paidFrom?: "shop" | "outside";
  /** Stores with branches: the branch whose money paid this part (shop money only). */
  branchId?: string | null;
  /** When paidFrom is "outside": who paid, and whether it counts as their capital or a loan to repay. */
  funderId?: string | null;
  funderTreatment?: "capital" | "loan" | null;
  /** Stores with branches: the branch whose bills this part is applied to. Without it the bills of the branch whose money paid are used, and money from outside is applied to the oldest bills. */
  billBranchId?: string | null;
}

/**
 * Checks one payment line and builds the supplier_ledger row for it.
 * A payment from shop money must say which branch's money paid it (stores with branches); a payment from
 * outside belongs to no branch, and its funder must be on this store's list.
 * @returns the row to insert, or why the line was refused
 */
export async function buildPaymentRow(
  storeId: string,
  supplierId: string,
  date: string,
  note: string | null,
  line: PaymentLineInput,
  createdBy: string,
  extra: Record<string, unknown> = {},
): Promise<{ ok: true; row: Record<string, unknown> } | { ok: false; error: string }> {
  const paidFrom = line.paidFrom ?? "shop";
  let branchId: string | null = null;
  if (paidFrom === "shop") {
    if (line.branchId) {
      // branchId comes from the browser: it must be one of this store's own branches.
      const { data: branch } = await supabaseAdmin
        .from("store_branches")
        .select("id")
        .eq("id", line.branchId)
        .eq("store_id", storeId)
        .maybeSingle();
      if (!branch) return { ok: false, error: "Branch not found" };
      branchId = branch.id as string;
    } else {
      const { count } = await supabaseAdmin.from("store_branches").select("id", { count: "exact", head: true }).eq("store_id", storeId);
      if ((count ?? 0) > 0) return { ok: false, error: "Choose which branch's money was used for each part" };
    }
  }

  let billBranchId: string | null = null;
  if (line.billBranchId) {
    const { data: billBranch } = await supabaseAdmin.from("store_branches").select("id").eq("id", line.billBranchId).eq("store_id", storeId).maybeSingle();
    if (!billBranch) return { ok: false, error: "Branch not found" };
    billBranchId = billBranch.id as string;
  }

  const funder = await resolveFunder(storeId, paidFrom, line.funderId, line.funderTreatment);
  if (!funder.ok) return { ok: false, error: funder.error };

  return {
    ok: true,
    row: {
      store_id: storeId,
      supplier_id: supplierId,
      kind: "payment",
      amount: line.amount,
      entry_date: date,
      payment_method: line.paymentMethod ?? "cash",
      note,
      created_by: createdBy,
      paid_from: paidFrom,
      branch_id: branchId,
      // Only sent when set, so a database without the column keeps working (see insertLedgerRows).
      ...(billBranchId ? { bill_branch_id: billBranchId } : {}),
      // Only sent when set, so a database without the columns keeps working.
      ...(funder.funderId ? { funder_id: funder.funderId, funder_treatment: funder.treatment } : {}),
      ...extra,
    },
  };
}

/**
 * Inserts supplier ledger rows in one statement. A database without the bill branch column
 * (migration 20261129) refuses the column: the rows are then saved without it, and a payment is
 * applied to the bills of the branch whose money paid it.
 * @returns the error message, or null when saved
 */
export async function insertLedgerRows(rows: Record<string, unknown>[]): Promise<string | null> {
  const { error } = await supabaseAdmin.from("supplier_ledger").insert(rows);
  if (!error) return null;
  if ((error.code === "42703" || error.code === "PGRST204") && rows.some((r) => "bill_branch_id" in r)) {
    const stripped = rows.map((r) => {
      const { bill_branch_id: _ignored, ...rest } = r;
      void _ignored;
      return rest;
    });
    const retry = await supabaseAdmin.from("supplier_ledger").insert(stripped);
    return retry.error ? retry.error.message : null;
  }
  return error.message;
}
