"use server";

import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { authorizeForStore, logActivity } from "@/lib/permissions/server";
import { fetchAllPaged } from "@/lib/queries/utils/fetchAllPaged";
import type {
  SupplierBalance,
  SupplierEntryInput,
  SupplierLedgerEntry,
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
  branchId: z.string().uuid().nullable().optional(),
  note: z.string().trim().max(300, "Note is too long").optional(),
});

interface LedgerRow {
  id: string;
  supplier_id: string;
  kind: string;
  amount: number;
  entry_date: string;
  payment_method: string | null;
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
      .select("id, supplier_id, kind, amount, entry_date, payment_method, note")
      .eq("store_id", storeId)
      .eq("supplier_id", supplierId)
      .order("entry_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    return ((data ?? []) as LedgerRow[]).map((r) => ({
      id: r.id,
      supplierId: r.supplier_id,
      kind: r.kind === "payment" ? "payment" : "bill",
      amount: Number(r.amount),
      date: r.entry_date,
      paymentMethod: r.payment_method,
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

    const { data, error } = await supabaseAdmin
      .from("supplier_ledger")
      .insert({
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
      })
      .select("id")
      .single();
    if (error) return { success: false, error: error.message };

    await logActivity(auth.actor, {
      action: "stock.supplier_money",
      entityType: "supplier_ledger",
      entityId: data?.id ?? null,
      summary: `${v.kind === "bill" ? "Bill" : "Payment"} ৳${v.amount} — ${supplier.name}`,
      details: { supplier_id: v.supplierId, date: v.date, note: v.note ?? null },
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to save the entry" };
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
