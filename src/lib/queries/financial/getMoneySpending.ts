import { supabase } from "@/lib/supabase";
import { fetchAllPaged } from "@/lib/queries/utils/fetchAllPaged";

export interface MoneySpend {
  /** Where it came from: an expense, or a payment to a supplier. */
  source: "expense" | "supplier";
  amount: number;
  /** The method it was paid by; empty means cash. */
  payment_method: string | null;
  branch_id: string | null;
  /** Whose money paid it: the shop's own, or an investor / the owner's pocket. */
  paid_from: "shop" | "outside";
}

interface ExpenseRow {
  amount: number;
  payment_method: string | null;
  branch_id: string | null;
  paid_from: "shop" | "outside";
}

interface SupplierRow {
  amount: number;
  payment_method: string | null;
  branch_id: string | null;
  paid_from: "shop" | "outside";
}

async function loadExpenses(storeId: string, fromDate: string, toDate: string, branchId: string | null): Promise<MoneySpend[]> {
  const rows = await fetchAllPaged<ExpenseRow>((from, to) => {
    let query = supabase
      .from("expenses")
      .select("amount, payment_method, branch_id, paid_from")
      .eq("store_id", storeId)
      .in("paid_from", ["shop", "outside"])
      .gte("expense_date", fromDate)
      .lte("expense_date", toDate);
    if (branchId) query = query.eq("branch_id", branchId);
    return query.order("id").range(from, to) as unknown as PromiseLike<{
      data: ExpenseRow[] | null;
      error: { message: string } | null;
    }>;
  });
  return rows.map((r) => ({
    source: "expense",
    amount: Number(r.amount),
    payment_method: r.payment_method,
    branch_id: r.branch_id,
    paid_from: r.paid_from,
  }));
}

async function loadSupplierPayments(storeId: string, fromDate: string, toDate: string, branchId: string | null): Promise<MoneySpend[]> {
  const rows = await fetchAllPaged<SupplierRow>((from, to) => {
    let query = supabase
      .from("supplier_ledger")
      .select("amount, payment_method, branch_id, paid_from")
      .eq("store_id", storeId)
      .eq("kind", "payment")
      .in("paid_from", ["shop", "outside"])
      .gte("entry_date", fromDate)
      .lte("entry_date", toDate);
    if (branchId) query = query.eq("branch_id", branchId);
    return query.order("id").range(from, to) as unknown as PromiseLike<{
      data: SupplierRow[] | null;
      error: { message: string } | null;
    }>;
  });
  return rows.map((r) => ({
    source: "supplier",
    amount: Number(r.amount),
    payment_method: r.payment_method,
    branch_id: r.branch_id,
    paid_from: r.paid_from,
  }));
}

/**
 * Expenses and supplier payments in a range that were marked as paid from the
 * shop's own money or from outside (an investor or the owner's pocket). The
 * caller must only take the "shop" ones off the cash / bKash balances.
 * Entries made before the choice existed are left out.
 * Each source is empty when its table or column isn't there yet, or the viewer
 * can't read it (supplier payments are the owner's to see).
 * @returns every counted spend, in the period (one branch's when `branchId` is given)
 */
export async function getMoneySpending(
  storeId: string,
  fromDate: string,
  toDate: string,
  branchId?: string | null,
): Promise<MoneySpend[]> {
  if (!storeId) return [];
  const [expenses, suppliers] = await Promise.all([
    loadExpenses(storeId, fromDate, toDate, branchId ?? null).catch(() => []),
    loadSupplierPayments(storeId, fromDate, toDate, branchId ?? null).catch(() => []),
  ]);
  return [...expenses, ...suppliers];
}
