"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { authorizeForStore } from "@/lib/permissions/server";
import { fetchAllPaged } from "@/lib/queries/utils/fetchAllPaged";
import {
  allocateSupplierPayments,
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
  | { success: true; rows: SupplierBillRow[]; summary: BillSummary }
  | { success: false; error: string };

interface LedgerRow {
  id: string;
  supplier_id: string;
  kind: string;
  amount: number;
  entry_date: string;
  created_at: string;
  purchase_id?: string | null;
}

/** The store's today (Asia/Dhaka) as YYYY-MM-DD. */
function dhakaToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

/**
 * Every supplier bill with how much of it is paid and what is left, plus the
 * totals: Accounts payable, overdue, due in the next 7 days and ageing. Needs
 * the supplier bills permission.
 * @returns the bills newest first, or why they could not be read
 */
export async function getSupplierBills(storeId: string): Promise<SupplierBillsResult> {
  try {
    const auth = await authorizeForStore(storeId, PERMISSION);
    if (!auth.ok) return { success: false, error: auth.error };

    const load = (columns: string) =>
      fetchAllPaged<LedgerRow>((from, to) =>
        supabaseAdmin
          .from("supplier_ledger")
          .select(columns)
          .eq("store_id", storeId)
          .order("id")
          .range(from, to) as unknown as PromiseLike<{ data: LedgerRow[] | null; error: { message: string } | null }>,
      );

    let ledger: LedgerRow[];
    try {
      ledger = await load("id, supplier_id, kind, amount, entry_date, created_at, purchase_id");
    } catch {
      // The purchases migration isn't in the database yet: every bill is a legacy bill.
      ledger = await load("id, supplier_id, kind, amount, entry_date, created_at");
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
        });
      } else {
        payments.push({ supplierId: r.supplier_id, amount: Number(r.amount) });
      }
    }

    const meta: Record<string, PurchaseMeta> = {};
    const purchaseIds = [...new Set(bills.map((b) => b.purchaseId).filter((id): id is string => !!id))];
    for (let i = 0; i < purchaseIds.length; i += 100) {
      const { data, error } = await supabaseAdmin
        .from("purchases")
        .select("id, bill_no, due_date")
        .eq("store_id", storeId)
        .in("id", purchaseIds.slice(i, i + 100));
      if (error) throw new Error(error.message);
      for (const p of (data ?? []) as { id: string; bill_no: string | null; due_date: string | null }[]) {
        meta[p.id] = { billNo: p.bill_no, dueDate: p.due_date };
      }
    }

    const { data: supplierData, error: supplierError } = await supabaseAdmin
      .from("suppliers")
      .select("id, name")
      .eq("store_id", storeId);
    if (supplierError) throw new Error(supplierError.message);
    const names = new Map(((supplierData ?? []) as { id: string; name: string }[]).map((s) => [s.id, s.name]));

    const { rows, summary } = allocateSupplierPayments(bills, payments, meta, dhakaToday());
    return {
      success: true,
      rows: rows
        .map((r) => ({ ...r, supplierName: names.get(r.supplierId) ?? "—" }))
        .sort((a, b) => (a.date === b.date ? 0 : a.date < b.date ? 1 : -1)),
      summary,
    };
  } catch (error) {
    console.error("getSupplierBills failed:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to load supplier bills" };
  }
}
