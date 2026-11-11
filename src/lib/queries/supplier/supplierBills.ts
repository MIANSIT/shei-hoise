"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { authorizeForStore } from "@/lib/permissions/server";
import { fetchAllPaged } from "@/lib/queries/utils/fetchAllPaged";
import { loadSupplierTermsDays } from "./supplierTerms";
import {
  allocateSupplierPayments,
  summarizeBillRows,
  type BillRow,
  type BillSummary,
  type PurchaseMeta,
  type RawBill,
  type RawPayment,
} from "./supplierBillMath";

/** What each supplier is owed, so it is the same permission as the supplier ledger. */
const PERMISSION = "stock.supplier_money";

export interface SupplierBillRow extends BillRow {
  supplierName: string;
}

export type SupplierBillsResult =
  | {
      success: true;
      rows: SupplierBillRow[];
      summary: BillSummary;
      /** Bills with no branch (older ones): they show only under "all branches", never in one branch's list. */
      unassignedCount: number;
    }
  | { success: false; error: string };

interface LedgerRow {
  id: string;
  supplier_id: string;
  kind: string;
  amount: number;
  entry_date: string;
  created_at: string;
  purchase_id?: string | null;
  branch_id?: string | null;
  bill_branch_id?: string | null;
  paid_from?: string | null;
}

/** The store's today (Asia/Dhaka) as YYYY-MM-DD. */
function dhakaToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

/** Loads every bill with its paid and left amounts, and the whole-store totals. No permission check: callers do their own. */
async function loadBills(storeId: string): Promise<{ rows: SupplierBillRow[]; summary: BillSummary; today: string }> {
  const load = (columns: string) =>
    fetchAllPaged<LedgerRow>((from, to) =>
      supabaseAdmin
        .from("supplier_ledger")
        .select(columns)
        .eq("store_id", storeId)
        .order("id")
        .range(from, to) as unknown as PromiseLike<{ data: LedgerRow[] | null; error: { message: string } | null }>,
    );

  // The newest columns first, falling back to what the database has: the branch of each bill and payment
  // (migration 20261129 adds bill_branch_id), then the purchases link (migration 20261114).
  let ledger: LedgerRow[];
  try {
    ledger = await load("id, supplier_id, kind, amount, entry_date, created_at, purchase_id, branch_id, bill_branch_id, paid_from");
  } catch {
    try {
      ledger = await load("id, supplier_id, kind, amount, entry_date, created_at, purchase_id, branch_id, paid_from");
    } catch {
      try {
        ledger = await load("id, supplier_id, kind, amount, entry_date, created_at, purchase_id");
      } catch {
        // The purchases migration isn't in the database yet: every bill is a legacy bill.
        ledger = await load("id, supplier_id, kind, amount, entry_date, created_at");
      }
    }
  }

  const bills: RawBill[] = [];
  const payments: RawPayment[] = [];
  for (const r of ledger) {
    if (r.kind === "bill") {
      bills.push({
        id: r.id,
        supplierId: r.supplier_id,
        date: r.entry_date,
        createdAt: r.created_at,
        amount: Number(r.amount),
        purchaseId: r.purchase_id ?? null,
        // A bill typed by hand carries its own branch; one made by Receive Stock takes it from its purchase below.
        branchId: r.branch_id ?? null,
      });
    } else {
      // A payment is applied to the bills of the branch it names; without one, a payment from the shop's money
      // pays the bills of the branch whose money it was, and money from outside (an investor) is not tied to a branch.
      const target = r.bill_branch_id ?? (r.kind === "credit" || (r.paid_from ?? "shop") === "shop" ? (r.branch_id ?? null) : null);
      payments.push({ supplierId: r.supplier_id, amount: Number(r.amount), targetBranchId: target });
    }
  }

  const meta: Record<string, PurchaseMeta> = {};
  const branchByPurchase = new Map<string, string | null>();
  const purchaseIds = [...new Set(bills.map((b) => b.purchaseId).filter((id): id is string => !!id))];
  for (let i = 0; i < purchaseIds.length; i += 100) {
    const { data, error } = await supabaseAdmin
      .from("purchases")
      .select("id, bill_no, due_date, attachment_url, branch_id")
      .eq("store_id", storeId)
      .in("id", purchaseIds.slice(i, i + 100));
    if (error) throw new Error(error.message);
    for (const p of (data ?? []) as { id: string; bill_no: string | null; due_date: string | null; attachment_url: string | null; branch_id: string | null }[]) {
      meta[p.id] = { billNo: p.bill_no, dueDate: p.due_date, attachment: p.attachment_url };
      branchByPurchase.set(p.id, p.branch_id);
    }
  }
  for (const bill of bills) {
    if (bill.purchaseId && branchByPurchase.has(bill.purchaseId)) bill.branchId = branchByPurchase.get(bill.purchaseId) ?? bill.branchId ?? null;
  }

  const { data: supplierData, error: supplierError } = await supabaseAdmin
    .from("suppliers")
    .select("id, name")
    .eq("store_id", storeId);
  if (supplierError) throw new Error(supplierError.message);
  const names = new Map(((supplierData ?? []) as { id: string; name: string }[]).map((s) => [s.id, s.name]));

  // A bill with no pay-by date is due after its own supplier's terms, if that supplier has any.
  const supplierTerms = await loadSupplierTermsDays(storeId);
  const today = dhakaToday();
  const { rows, summary } = allocateSupplierPayments(bills, payments, meta, today, (supplierId) => supplierTerms.get(supplierId) ?? null);
  return {
    rows: rows
      .map((r) => ({ ...r, supplierName: names.get(r.supplierId) ?? "—" }))
      .sort((a, b) => (a.date === b.date ? 0 : a.date < b.date ? 1 : -1)),
    summary,
    today,
  };
}

/**
 * Every supplier bill with how much of it is paid and what is left, plus the totals: Accounts payable, overdue,
 * due in the next 7 days and ageing. Needs the supplier bills permission.
 *
 * A bill belongs to the branch that received the goods; a payment is applied to the bills of the branch it
 * names first (see allocateSupplierPayments), whichever branch's money paid it.
 * @param branchId stores with branches: only that branch's bills and totals; omitted or null = every bill
 * @returns the bills newest first, or why they could not be read
 */
export async function getSupplierBills(storeId: string, branchId?: string | null): Promise<SupplierBillsResult> {
  try {
    const auth = await authorizeForStore(storeId, PERMISSION);
    if (!auth.ok) return { success: false, error: auth.error };

    const all = await loadBills(storeId);
    const unassignedCount = all.rows.filter((r) => !r.branchId).length;
    if (!branchId) return { success: true, rows: all.rows, summary: all.summary, unassignedCount };
    const rows = all.rows.filter((r) => r.branchId === branchId);
    // Money paid ahead is not tied to any branch, so it is not part of one branch's totals.
    return { success: true, rows, summary: summarizeBillRows(rows, 0, all.today), unassignedCount };
  } catch (error) {
    console.error("getSupplierBills failed:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to load supplier bills" };
  }
}

/**
 * What one branch still owes suppliers: the unpaid part of the bills for the goods it received.
 * For the Balance Sheet: one number, for people who may see supplier money.
 * @returns the amount, or null when it cannot be worked out (the caller keeps the store-wide figure)
 */
export async function getBranchPayable(storeId: string, branchId: string): Promise<number | null> {
  try {
    const auth = await authorizeForStore(storeId, PERMISSION);
    if (!auth.ok) return null;
    const all = await loadBills(storeId);
    return summarizeBillRows(all.rows.filter((r) => r.branchId === branchId), 0, all.today).payable;
  } catch (error) {
    console.error("getBranchPayable failed:", error);
    return null;
  }
}

/**
 * Gives a bill that has no branch (an older bill) the branch that received the goods. Needs the supplier bills
 * permission. A bill that already has a branch is left alone.
 * @returns success, or why it could not be saved
 */
export async function setSupplierBillBranch(
  storeId: string,
  billId: string,
  branchId: string,
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const auth = await authorizeForStore(storeId, PERMISSION);
    if (!auth.ok) return { success: false, error: auth.error };

    const { data: branch } = await supabaseAdmin.from("store_branches").select("id").eq("id", branchId).eq("store_id", storeId).maybeSingle();
    if (!branch) return { success: false, error: "Branch not found" };

    const { data: bill } = await supabaseAdmin
      .from("supplier_ledger")
      .select("id, kind, branch_id, purchase_id")
      .eq("id", billId)
      .eq("store_id", storeId)
      .maybeSingle();
    const row = bill as { id: string; kind: string; branch_id: string | null; purchase_id: string | null } | null;
    if (!row || row.kind !== "bill") return { success: false, error: "Bill not found" };
    if (row.branch_id) return { success: false, error: "This bill already has a branch" };

    const { error } = await supabaseAdmin.from("supplier_ledger").update({ branch_id: branchId }).eq("id", billId).eq("store_id", storeId);
    if (error) return { success: false, error: error.message };
    if (row.purchase_id) {
      await supabaseAdmin.from("purchases").update({ branch_id: branchId }).eq("id", row.purchase_id).eq("store_id", storeId).is("branch_id", null);
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to save the branch" };
  }
}
