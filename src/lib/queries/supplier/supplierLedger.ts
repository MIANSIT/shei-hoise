"use server";

import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { authorizeForStore, logActivity } from "@/lib/permissions/server";
import { fetchAllPaged } from "@/lib/queries/utils/fetchAllPaged";
import { resolveFunder } from "@/lib/queries/financial/resolveFunder";
import { buildPaymentRow, insertLedgerRows, PAYMENT_METHODS as PAYMENT_METHOD_VALUES } from "./supplierPaymentRow";
import type {
  SupplierBalance,
  SupplierEntryInput,
  SupplierLedgerEntry,
  SupplierPaymentsInput,
  SupplierResult,
} from "./supplierTypes";

/** What each supplier is owed or has been paid; needs the supplier money permission. */
const PERMISSION = "stock.supplier_money";
const PAYMENT_METHODS = ["cash", "mobile_banking", "card", "bank_transfer", "online", "other"] as const;

const entrySchema = z.object({
  supplierId: z.string().uuid(),
  kind: z.enum(["bill", "payment"]),
  amount: z.number().positive("Enter an amount above zero").max(1_000_000_000, "Amount is too large"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a valid date"),
  paymentMethod: z.enum(PAYMENT_METHODS).optional(),
  paidFrom: z.enum(["shop", "outside"]).optional(),
  funderId: z.string().uuid().nullable().optional(),
  funderTreatment: z.enum(["capital", "loan"]).nullable().optional(),
  branchId: z.string().uuid().nullable().optional(),
  billBranchId: z.string().uuid().nullable().optional(),
  note: z.string().trim().max(300, "Note is too long").optional(),
});

interface LedgerRow {
  id: string;
  supplier_id: string;
  kind: string;
  amount: number;
  entry_date: string;
  payment_method: string | null;
  branch_id?: string | null;
  note: string | null;
}

/**
 * Bills, payments and what is still due for every supplier. Empty when the
 * caller lacks the permission or the ledger table isn't there yet.
 * @returns supplier id → balance (suppliers with no entries are absent)
 */
export async function getSupplierBalances(storeId: string): Promise<Record<string, SupplierBalance>> {
  try {
    const auth = await authorizeForStore(storeId, PERMISSION);
    if (!auth.ok) return {};
    const rows = await fetchAllPaged<{ supplier_id: string; kind: string; amount: number }>((from, to) =>
      supabaseAdmin
        .from("supplier_ledger")
        .select("supplier_id, kind, amount")
        .eq("store_id", storeId)
        .order("id")
        .range(from, to) as unknown as PromiseLike<{
        data: { supplier_id: string; kind: string; amount: number }[] | null;
        error: { message: string } | null;
      }>,
    );
    const balances: Record<string, SupplierBalance> = {};
    for (const row of rows) {
      const entry = balances[row.supplier_id] ?? { supplierId: row.supplier_id, billed: 0, paid: 0, due: 0 };
      if (row.kind === "bill") entry.billed += Number(row.amount);
      else entry.paid += Number(row.amount);
      entry.due = entry.billed - entry.paid;
      balances[row.supplier_id] = entry;
    }
    return balances;
  } catch (error) {
    console.error("getSupplierBalances failed:", error);
    return {};
  }
}

/**
 * One supplier's bills and payments, newest first.
 * @returns the entries, or an empty list when not allowed or on failure
 */
export async function getSupplierLedger(storeId: string, supplierId: string): Promise<SupplierLedgerEntry[]> {
  try {
    const auth = await authorizeForStore(storeId, PERMISSION);
    if (!auth.ok) return [];
    const { data, error } = await supabaseAdmin
      .from("supplier_ledger")
      .select("id, supplier_id, kind, amount, entry_date, payment_method, note, branch_id")
      .eq("store_id", storeId)
      .eq("supplier_id", supplierId)
      .order("entry_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    return ((data ?? []) as LedgerRow[]).map((r) => ({
      id: r.id,
      supplierId: r.supplier_id,
      kind: r.kind === "payment" ? "payment" : r.kind === "credit" ? "credit" : "bill",
      amount: Number(r.amount),
      date: r.entry_date,
      paymentMethod: r.payment_method,
      branchId: r.branch_id ?? null,
      note: r.note,
    }));
  } catch (error) {
    console.error("getSupplierLedger failed:", error);
    return [];
  }
}

/**
 * Records a bill (goods bought, adds to what is owed) or a payment (money
 * paid, reduces it).
 * @returns success, or why it failed
 */
export async function addSupplierEntry(storeId: string, input: SupplierEntryInput): Promise<SupplierResult> {
  try {
    const auth = await authorizeForStore(storeId, PERMISSION);
    if (!auth.ok) return { success: false, error: auth.error };

    const parsed = entrySchema.safeParse(input);
    if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Check the details" };
    const v = parsed.data;

    // The supplier must be this store's own.
    const { data: supplier } = await supabaseAdmin
      .from("suppliers")
      .select("name")
      .eq("id", v.supplierId)
      .eq("store_id", storeId)
      .maybeSingle();
    if (!supplier) return { success: false, error: "Supplier not found" };

    // Only a payment from the shop's own money moves a branch's cash or bKash balance.
    const isPayment = v.kind === "payment";
    const paidFrom = isPayment ? (v.paidFrom ?? "shop") : null;
    let branchId: string | null = null;
    if (isPayment && paidFrom === "shop") {
      if (v.branchId) {
        // branchId comes from the browser — it must be one of this store's own branches.
        const { data: branch } = await supabaseAdmin
          .from("store_branches")
          .select("id")
          .eq("id", v.branchId)
          .eq("store_id", storeId)
          .maybeSingle();
        if (!branch) return { success: false, error: "Branch not found" };
        branchId = branch.id;
      } else {
        const { count } = await supabaseAdmin
          .from("store_branches")
          .select("id", { count: "exact", head: true })
          .eq("store_id", storeId);
        if ((count ?? 0) > 0) return { success: false, error: "Choose which branch the money was paid from" };
      }
    }

    const funder = isPayment ? await resolveFunder(storeId, paidFrom, v.funderId, v.funderTreatment, { amount: v.amount }) : null;
    if (funder && !funder.ok) return { success: false, error: funder.error };

    // A bill typed by hand belongs to the branch that received the goods (stores with branches).
    let billBranch: string | null = null;
    if (!isPayment && v.branchId) {
      const { data: bb } = await supabaseAdmin.from("store_branches").select("id").eq("id", v.branchId).eq("store_id", storeId).maybeSingle();
      if (!bb) return { success: false, error: "Branch not found" };
      billBranch = bb.id as string;
    }
    // A payment can name the branch whose bills it pays.
    let payBillBranch: string | null = null;
    if (isPayment && v.billBranchId) {
      const { data: pb } = await supabaseAdmin.from("store_branches").select("id").eq("id", v.billBranchId).eq("store_id", storeId).maybeSingle();
      if (!pb) return { success: false, error: "Branch not found" };
      payBillBranch = pb.id as string;
    }

    const row: Record<string, unknown> = {
      store_id: storeId,
      supplier_id: v.supplierId,
      kind: v.kind,
      amount: v.amount,
      entry_date: v.date,
      payment_method: isPayment ? (v.paymentMethod ?? "cash") : null,
      note: v.note || null,
      created_by: auth.actor.userId,
      // Only sent for a payment, so bills keep working on a database without the paid-from migration.
      ...(isPayment ? { paid_from: paidFrom, branch_id: branchId } : {}),
      ...(billBranch ? { branch_id: billBranch } : {}),
      ...(payBillBranch ? { bill_branch_id: payBillBranch } : {}),
      // Only sent when set, so a database without the columns keeps working.
      ...(funder && funder.ok && funder.funderId ? { funder_id: funder.funderId, funder_treatment: funder.treatment } : {}),
    };
    const insertError = await insertLedgerRows([row]);
    if (insertError) return { success: false, error: insertError };
    const data: { id: string } | null = null;

    await logActivity(auth.actor, {
      action: "stock.supplier_money",
      entityType: "supplier_ledger",
      entityId: (data as { id: string } | null)?.id ?? null,
      summary: `${v.kind === "bill" ? "Bill" : "Payment"} ৳${v.amount} — ${supplier.name}`,
      details: { supplier_id: v.supplierId, date: v.date, note: v.note ?? null },
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to save the entry" };
  }
}

const paymentsSchema = z.object({
  supplierId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a valid date"),
  note: z.string().trim().max(300, "Note is too long").optional(),
  lines: z
    .array(
      z.object({
        amount: z.number().positive("Enter an amount above zero for every part").max(1_000_000_000, "Amount is too large"),
        paymentMethod: z.enum(PAYMENT_METHOD_VALUES).optional(),
        paidFrom: z.enum(["shop", "outside"]).optional(),
        branchId: z.string().uuid().nullable().optional(),
        billBranchId: z.string().uuid().nullable().optional(),
        funderId: z.string().uuid().nullable().optional(),
        funderTreatment: z.enum(["capital", "loan"]).nullable().optional(),
      }),
    )
    .min(1, "Add at least one part")
    .max(10, "Too many parts in one payment"),
});

/**
 * Records one payment to a supplier that is split over several parts: each part has its own amount, branch,
 * method and who paid (the shop's money, or an owner or investor). Every part is a payment of its own, so each
 * branch's and method's balance goes down by exactly its part. All parts are saved together, or none.
 * @returns success, or why it failed
 */
export async function addSupplierPayments(storeId: string, input: SupplierPaymentsInput): Promise<SupplierResult> {
  try {
    const auth = await authorizeForStore(storeId, PERMISSION);
    if (!auth.ok) return { success: false, error: auth.error };

    const parsed = paymentsSchema.safeParse(input);
    if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Check the details" };
    const v = parsed.data;

    const { data: supplier } = await supabaseAdmin.from("suppliers").select("name").eq("id", v.supplierId).eq("store_id", storeId).maybeSingle();
    if (!supplier) return { success: false, error: "Supplier not found" };

    const rows: Record<string, unknown>[] = [];
    // Money taken from each investor's account by the parts so far, so the parts are checked together.
    const taken = new Map<string, number>();
    for (const line of v.lines) {
      const built = await buildPaymentRow(storeId, v.supplierId, v.date, v.note || null, line, auth.actor.userId, {}, taken);
      if (!built.ok) return { success: false, error: built.error };
      rows.push(built.row);
    }

    // One insert: the parts are saved together or not at all.
    const insertError = await insertLedgerRows(rows);
    if (insertError) return { success: false, error: insertError };

    const total = Math.round(v.lines.reduce((sum, l) => sum + l.amount, 0) * 100) / 100;
    await logActivity(auth.actor, {
      action: "stock.supplier_money",
      entityType: "supplier_ledger",
      entityId: null,
      summary: `Payment ৳${total} in ${v.lines.length} parts — ${supplier.name}`,
      details: { supplier_id: v.supplierId, date: v.date, parts: v.lines.map((l) => ({ amount: l.amount, method: l.paymentMethod ?? "cash", paid_from: l.paidFrom ?? "shop", branch_id: l.branchId ?? null })) },
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to save the payment" };
  }
}

/**
 * Removes an entry that was typed by mistake.
 * @returns success, or why it failed
 */
export async function deleteSupplierEntry(storeId: string, entryId: string): Promise<SupplierResult> {
  try {
    const auth = await authorizeForStore(storeId, PERMISSION);
    if (!auth.ok) return { success: false, error: auth.error };

    const { data: existing } = await supabaseAdmin
      .from("supplier_ledger")
      .select("kind, amount, supplier_id")
      .eq("id", entryId)
      .eq("store_id", storeId)
      .maybeSingle();
    if (!existing) return { success: false, error: "Entry not found" };

    const { error } = await supabaseAdmin.from("supplier_ledger").delete().eq("id", entryId).eq("store_id", storeId);
    if (error) return { success: false, error: error.message };

    await logActivity(auth.actor, {
      action: "stock.supplier_money",
      entityType: "supplier_ledger",
      entityId: entryId,
      summary: `Deleted ${existing.kind} of ৳${existing.amount}`,
      details: existing,
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to delete the entry" };
  }
}
