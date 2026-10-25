import { supabase } from "@/lib/supabase";
import { fetchAllPaged } from "@/lib/queries/utils/fetchAllPaged";
import { getCustomersWithDue } from "@/lib/queries/customers/getCustomersWithDue";
import { getUnsettledCodOrders } from "@/lib/queries/orders/codSettlements";
import { getVendorsOverviewStats } from "@/lib/queries/vendor/getVendorsOverviewStats";
import { getOwnerWithdrawals } from "./getOwnerWithdrawals";

export type MoneyMethodKey =
  | "cash"
  | "mobile_banking"
  | "card"
  | "bank_transfer"
  | "online"
  | "cod"
  | "other";

const METHOD_KEYS: readonly MoneyMethodKey[] = [
  "cash",
  "mobile_banking",
  "card",
  "bank_transfer",
  "online",
  "cod",
  "other",
];

export interface MoneyMethodRow {
  method: MoneyMethodKey;
  /** Orders paid in full at the sale, or settled by the courier (COD). */
  fromOrders: number;
  /** Payments collected against customer dues and part-paid orders. */
  fromDues: number;
  /** Payments received from vendors. */
  fromVendors: number;
  /** Total received on this method. */
  total: number;
  /** The owner took this much out on this method (0 unless withdrawals were requested). */
  withdrawn: number;
  /** total − withdrawn. */
  left: number;
}

export interface MoneyBranchRow {
  /** null = money not tied to any branch (older records). */
  branchId: string | null;
  received: number;
  withdrawn: number;
  left: number;
}

export interface MoneyOverview {
  /** Everything that came in during the period, whatever the way. */
  receivedTotal: number;
  /** What the owner took out for themselves in the period (0 unless withdrawals were requested). */
  withdrawnTotal: number;
  /** receivedTotal − withdrawnTotal. */
  leftTotal: number;
  /** "All branches" on a store with branches: each branch's received, withdrawn and left. Empty otherwise. */
  byBranch: MoneyBranchRow[];
  /** One row per payment method that took or gave out money, biggest first. */
  byMethod: MoneyMethodRow[];
  /** What is still outstanding right now (not limited to the period). */
  pending: {
    customerDue: number;
    /** Delivered COD orders whose cash the courier hasn't handed over yet, after the courier's own charge. */
    codWithCourier: number;
    /** What vendors owe the store (vendor-wide, whichever branch sent the goods). */
    vendorDue: number;
    total: number;
  };
}

const EMPTY: MoneyOverview = {
  receivedTotal: 0,
  withdrawnTotal: 0,
  leftTotal: 0,
  byBranch: [],
  byMethod: [],
  pending: { customerDue: 0, codWithCourier: 0, vendorDue: 0, total: 0 },
};

function normalizeMethod(raw: string | null | undefined): MoneyMethodKey {
  const key = String(raw ?? "").trim().toLowerCase();
  return (METHOD_KEYS as readonly string[]).includes(key) ? (key as MoneyMethodKey) : "other";
}

interface PaidOrderRow {
  id: string;
  branch_id?: string | null;
  payment_method: string | null;
  subtotal: number | null;
  discount_amount: number | null;
  additional_charges: number | null;
}

interface PaymentRow {
  amount: number;
  branch_id?: string | null;
  payment_method: string | null;
}

/** The store runs on Bangladesh time, like the other money pages (see getCodMarkedPaidCashForDate). */
function dayStartIso(date: string): string {
  return new Date(`${date}T00:00:00+06:00`).toISOString();
}
function dayEndIso(date: string): string {
  return new Date(`${date}T23:59:59.999+06:00`).toISOString();
}

/**
 * Where the store's money is: what came in during a period by payment method,
 * and what is still to collect right now.
 *
 * Received counts each taka once, on the day it arrived:
 *  - orders paid in full (by `paid_at`), at the same per-order amount as the
 *    dashboard's "Received" (items − discount + extra charges);
 *  - customer-due collections (by `payment_date`), and
 *  - payments from vendors (by `payment_date`).
 * An order that has customer payments recorded against it is left out of the
 * first group — its money is already in the second — so a part-paid sale
 * isn't counted twice when its last payment marks it paid.
 *
 * Pending reuses the same figures the Customer Dues, COD Payouts and Vendors
 * pages show, so the numbers match those pages.
 * @returns the overview, or zeros when the query fails
 */
export async function getMoneyOverview(
  storeId: string,
  fromDate: string,
  toDate: string,
  /** Stores with branches: one branch's money. Omitted/null = the whole store. */
  branchId?: string | null,
  /** Whether the store uses branches (changes how customer dues are read). */
  withBranches = false,
  /** Owner only: also subtract the money they took out. Staff can't read withdrawals. */
  includeWithdrawals = false,
): Promise<MoneyOverview> {
  if (!storeId) return EMPTY;

  try {
    const paidFrom = dayStartIso(fromDate);
    const paidTo = dayEndIso(toDate);

    const [orders, duePayments, vendorPayments, customerDues, codOrders, vendorStats, withdrawals] = await Promise.all([
      fetchAllPaged<PaidOrderRow>((from, to) => {
        let query = supabase
          .from("orders")
          .select(
            withBranches
              ? "id, branch_id, payment_method, subtotal, discount_amount, additional_charges"
              : "id, payment_method, subtotal, discount_amount, additional_charges",
          )
          .eq("store_id", storeId)
          .eq("payment_status", "paid")
          .not("status", "in", "(cancelled,returned)")
          // Paid before paid_at existed: fall back to the order date.
          .or(
            `and(paid_at.gte.${paidFrom},paid_at.lte.${paidTo}),and(paid_at.is.null,order_date.gte.${fromDate},order_date.lte.${toDate})`,
          );
        if (branchId) query = query.eq("branch_id", branchId);
        return query.order("id").range(from, to) as unknown as PromiseLike<{
          data: PaidOrderRow[] | null;
          error: { message: string } | null;
        }>;
      }),
      loadPayments("customer_payments", storeId, fromDate, toDate, branchId ?? null, withBranches),
      loadPayments("vendor_payments", storeId, fromDate, toDate, branchId ?? null, withBranches),
      getCustomersWithDue(storeId, branchId ?? null, withBranches),
      getUnsettledCodOrders(storeId, null, branchId ?? null),
      getVendorsOverviewStats(storeId, branchId ?? null),
      // Before the withdrawals table exists, or if it can't be read, the rest of the page still works.
      includeWithdrawals
        ? getOwnerWithdrawals(storeId, fromDate, toDate, branchId ?? null).catch(() => [])
        : Promise.resolve([]),
    ]);

    // Orders with customer payments pinned to them: their money is counted
    // under due collections, not here.
    const ledgerOrderIds = await loadOrdersWithCustomerPayments(storeId, orders.map((o) => o.id));

    const rows = new Map<MoneyMethodKey, MoneyMethodRow>();
    const rowFor = (method: MoneyMethodKey): MoneyMethodRow => {
      let row = rows.get(method);
      if (!row) {
        row = { method, fromOrders: 0, fromDues: 0, fromVendors: 0, total: 0, withdrawn: 0, left: 0 };
        rows.set(method, row);
      }
      return row;
    };

    // Per-branch totals, only for the "All branches" view of a store with branches.
    const branchTotals = new Map<string | null, { received: number; withdrawn: number }>();
    const trackBranch = withBranches && !branchId;
    const addToBranch = (id: string | null | undefined, field: "received" | "withdrawn", amount: number) => {
      if (!trackBranch) return;
      const key = id ?? null;
      const entry = branchTotals.get(key) ?? { received: 0, withdrawn: 0 };
      entry[field] += amount;
      branchTotals.set(key, entry);
    };

    for (const order of orders) {
      if (ledgerOrderIds.has(order.id)) continue;
      const amount =
        Number(order.subtotal ?? 0) - Number(order.discount_amount ?? 0) + Number(order.additional_charges ?? 0);
      if (amount <= 0) continue;
      rowFor(normalizeMethod(order.payment_method)).fromOrders += amount;
      addToBranch(order.branch_id, "received", amount);
    }
    for (const p of duePayments) {
      rowFor(normalizeMethod(p.payment_method)).fromDues += Number(p.amount);
      addToBranch(p.branch_id, "received", Number(p.amount));
    }
    for (const p of vendorPayments) {
      rowFor(normalizeMethod(p.payment_method)).fromVendors += Number(p.amount);
      addToBranch(p.branch_id, "received", Number(p.amount));
    }

    for (const w of withdrawals) {
      rowFor(normalizeMethod(w.payment_method)).withdrawn += w.amount;
      addToBranch(w.branch_id, "withdrawn", w.amount);
    }

    const byMethod = [...rows.values()]
      .map((row) => {
        const total = row.fromOrders + row.fromDues + row.fromVendors;
        return { ...row, total, left: total - row.withdrawn };
      })
      .filter((row) => row.total > 0.005 || row.withdrawn > 0.005)
      .sort((a, b) => b.total - a.total);
    const receivedTotal = byMethod.reduce((sum, row) => sum + row.total, 0);
    const withdrawnTotal = byMethod.reduce((sum, row) => sum + row.withdrawn, 0);

    const customerDue = customerDues.reduce((sum, c) => sum + Number(c.total_due), 0);
    const codWithCourier = codOrders.reduce((sum, o) => sum + o.expected_from_courier, 0);
    const vendorDue = Math.max(vendorStats.total_due, 0);

    return {
      receivedTotal,
      withdrawnTotal,
      leftTotal: receivedTotal - withdrawnTotal,
      byBranch: [...branchTotals.entries()]
        .map(([id, t]) => ({ branchId: id, received: t.received, withdrawn: t.withdrawn, left: t.received - t.withdrawn }))
        .filter((b) => b.received > 0.005 || b.withdrawn > 0.005)
        .sort((a, b) => b.received - a.received),
      byMethod,
      pending: {
        customerDue,
        codWithCourier,
        vendorDue,
        total: customerDue + codWithCourier + vendorDue,
      },
    };
  } catch (error) {
    console.error("Failed to load money overview:", error);
    return EMPTY;
  }
}

/** Payments dated in the range. branch_id is only filtered on when a branch is picked, so stores without branches never depend on it. */
function loadPayments(
  table: "customer_payments" | "vendor_payments",
  storeId: string,
  fromDate: string,
  toDate: string,
  branchId: string | null,
  /** Also read each payment's branch (stores with branches). */
  withBranches = false,
): Promise<PaymentRow[]> {
  return fetchAllPaged<PaymentRow>((from, to) => {
    let query = supabase
      .from(table)
      .select(withBranches ? "amount, payment_method, branch_id" : "amount, payment_method")
      .eq("store_id", storeId)
      .gte("payment_date", fromDate)
      .lte("payment_date", toDate);
    if (branchId) query = query.eq("branch_id", branchId);
    return query.order("id").range(from, to) as unknown as PromiseLike<{
      data: PaymentRow[] | null;
      error: { message: string } | null;
    }>;
  });
}

const ID_CHUNK = 100;

async function loadOrdersWithCustomerPayments(storeId: string, orderIds: string[]): Promise<Set<string>> {
  const chunks: string[][] = [];
  for (let i = 0; i < orderIds.length; i += ID_CHUNK) chunks.push(orderIds.slice(i, i + ID_CHUNK));

  const results = await Promise.all(
    chunks.map(async (chunk) => {
      const { data, error } = await supabase
        .from("customer_payments")
        .select("order_id")
        .eq("store_id", storeId)
        .in("order_id", chunk);
      if (error) throw new Error(error.message);
      return (data ?? []) as { order_id: string | null }[];
    }),
  );

  const found = new Set<string>();
  for (const rows of results) {
    for (const row of rows) if (row.order_id) found.add(row.order_id);
  }
  return found;
}
