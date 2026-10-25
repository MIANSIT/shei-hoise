import { supabase } from "@/lib/supabase";
import { fetchAllPaged } from "@/lib/queries/utils/fetchAllPaged";
import { getCustomersWithDue } from "@/lib/queries/customers/getCustomersWithDue";
import { getUnsettledCodOrders } from "@/lib/queries/orders/codSettlements";
import { getPendingBalanceParts } from "@/lib/queries/dashboard/getPendingBalance";
import { getSalesSummary } from "@/lib/queries/dashboard/getSalesSummary";
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
  /** Payments received from vendors. Kept apart: not part of `total`. */
  fromVendors: number;
  /** The shop's money received on this method (orders and due collections). Vendor payments are not included. */
  total: number;
  /** The owner took this much out on this method (0 unless withdrawals were requested). */
  withdrawn: number;
  /** Moved out of this method into another (e.g. bKash cashed out to cash). Stays in the business. */
  movedOut: number;
  /** Moved into this method from another. */
  movedIn: number;
  /** What is on this method now: total + fromVendors − withdrawn − movedOut + movedIn. */
  left: number;
}

export interface MoneyBranchRow {
  /** null = money not tied to any branch (older records). */
  branchId: string | null;
  received: number;
  withdrawn: number;
  left: number;
}

/** Where the money that arrived in the period came from, adding up to receivedTotal. */
export interface MoneySources {
  /** Orders placed in the period and paid at the sale or settled by the courier. */
  ordersThisPeriod: number;
  /** Orders placed before the period that were paid during it. */
  ordersEarlier: number;
  /** Customer due collections and part-payments. */
  dueCollections: number;
  /** Payments from vendors. */
  vendorPayments: number;
}

/** The dashboard's sales figures for the same period, to set beside the money. */
export interface SalesComparison {
  /** Every order placed in the period that wasn't cancelled or returned, paid or not. */
  sales: number;
  /** The paid part of those orders. */
  received: number;
  /** Placed in the period and not paid yet. */
  unpaid: number;
}

export interface MoneyOverview {
  /** The shop's money that came in during the period (orders and due collections). Vendor payments are kept apart. */
  receivedTotal: number;
  /** Payments received from vendors during the period, shown on their own. */
  vendorReceivedTotal: number;
  sources: MoneySources;
  /** Null when the database doesn't have the sales summary yet. */
  salesComparison: SalesComparison | null;
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
    /** Delivered COD orders whose cash the courier hasn't handed over yet, at the full order total (as the dashboard counts it). */
    codWithCourier: number;
    /** What vendors owe the store. A vendor has one account for the whole store, so this is never split by branch. */
    vendorDue: number;
    /** customerDue + codWithCourier, the same as the dashboard's Pending Amount. What vendors owe is kept apart. */
    total: number;
  };
}

const EMPTY: MoneyOverview = {
  receivedTotal: 0,
  vendorReceivedTotal: 0,
  sources: { ordersThisPeriod: 0, ordersEarlier: 0, dueCollections: 0, vendorPayments: 0 },
  salesComparison: null,
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
  order_date: string | null;
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

    const [orders, duePayments, vendorPayments, pendingParts, vendorStats, withdrawals, salesSummary] = await Promise.all([
      fetchAllPaged<PaidOrderRow>((from, to) => {
        let query = supabase
          .from("orders")
          .select(
            withBranches
              ? "id, order_date, branch_id, payment_method, subtotal, discount_amount, additional_charges"
              : "id, order_date, payment_method, subtotal, discount_amount, additional_charges",
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
      // The dashboard's own "Pending Amount" figures, so the two pages always agree.
      getPendingBalanceParts(storeId, branchId ?? null),
      getVendorsOverviewStats(storeId, branchId ?? null),
      // Before the withdrawals table exists, or if it can't be read, the rest of the page still works.
      includeWithdrawals
        ? getOwnerWithdrawals(storeId, fromDate, toDate, branchId ?? null).catch(() => [])
        : Promise.resolve([]),
      getSalesSummary(storeId, fromDate, toDate, null, null, branchId ?? null),
    ]);

    // Orders with customer payments pinned to them: their money is counted
    // under due collections, not here.
    const ledgerOrderIds = await loadOrdersWithCustomerPayments(storeId, orders.map((o) => o.id));

    const rows = new Map<MoneyMethodKey, MoneyMethodRow>();
    const rowFor = (method: MoneyMethodKey): MoneyMethodRow => {
      let row = rows.get(method);
      if (!row) {
        row = { method, fromOrders: 0, fromDues: 0, fromVendors: 0, total: 0, withdrawn: 0, movedOut: 0, movedIn: 0, left: 0 };
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

    const sources: MoneySources = { ordersThisPeriod: 0, ordersEarlier: 0, dueCollections: 0, vendorPayments: 0 };

    for (const order of orders) {
      if (ledgerOrderIds.has(order.id)) continue;
      const amount =
        Number(order.subtotal ?? 0) - Number(order.discount_amount ?? 0) + Number(order.additional_charges ?? 0);
      if (amount <= 0) continue;
      rowFor(normalizeMethod(order.payment_method)).fromOrders += amount;
      addToBranch(order.branch_id, "received", amount);
      // Placed before the period but paid in it (e.g. last month's COD): it is money now, not this period's sales.
      if (order.order_date && order.order_date < fromDate) sources.ordersEarlier += amount;
      else sources.ordersThisPeriod += amount;
    }
    for (const p of duePayments) {
      rowFor(normalizeMethod(p.payment_method)).fromDues += Number(p.amount);
      addToBranch(p.branch_id, "received", Number(p.amount));
      sources.dueCollections += Number(p.amount);
    }
    for (const p of vendorPayments) {
      // Vendor money is kept apart from the shop's: it counts on the method it arrived by, but not in the shop totals.
      rowFor(normalizeMethod(p.payment_method)).fromVendors += Number(p.amount);
      sources.vendorPayments += Number(p.amount);
    }

    for (const w of withdrawals) {
      if (w.kind === "transfer") {
        // Money changing method stays in the business: it moves between rows and changes no total.
        rowFor(normalizeMethod(w.payment_method)).movedOut += w.amount;
        rowFor(normalizeMethod(w.to_method)).movedIn += w.amount;
        continue;
      }
      rowFor(normalizeMethod(w.payment_method)).withdrawn += w.amount;
      addToBranch(w.branch_id, "withdrawn", w.amount);
    }

    const byMethod = [...rows.values()]
      .map((row) => {
        const total = row.fromOrders + row.fromDues;
        return { ...row, total, left: total + row.fromVendors - row.withdrawn - row.movedOut + row.movedIn };
      })
      .filter(
        (row) =>
          row.total > 0.005 ||
          row.fromVendors > 0.005 ||
          row.withdrawn > 0.005 ||
          row.movedOut > 0.005 ||
          row.movedIn > 0.005,
      )
      .sort((a, b) => b.total - a.total);
    const receivedTotal = byMethod.reduce((sum, row) => sum + row.total, 0);
    const vendorReceivedTotal = byMethod.reduce((sum, row) => sum + row.fromVendors, 0);
    const withdrawnTotal = byMethod.reduce((sum, row) => sum + row.withdrawn, 0);

    let customerDue: number;
    let codWithCourier: number;
    if (pendingParts) {
      customerDue = pendingParts.customerDue;
      codWithCourier = pendingParts.codPending;
    } else {
      // The database function isn't there yet: work it out from the same lists the Customer Dues and COD Payouts pages use.
      const [customerDues, codOrders] = await Promise.all([
        getCustomersWithDue(storeId, branchId ?? null, withBranches),
        getUnsettledCodOrders(storeId, null, branchId ?? null),
      ]);
      customerDue = customerDues.reduce((sum, c) => sum + Number(c.total_due), 0);
      codWithCourier = codOrders.reduce((sum, o) => sum + o.expected_from_courier, 0);
    }
    const vendorDue = Math.max(vendorStats.total_due, 0);

    return {
      receivedTotal,
      vendorReceivedTotal,
      sources,
      salesComparison: salesSummary
        ? { sales: salesSummary.sales, received: salesSummary.received, unpaid: salesSummary.toCollect }
        : null,
      withdrawnTotal,
      leftTotal: receivedTotal + vendorReceivedTotal - withdrawnTotal,
      byBranch: [...branchTotals.entries()]
        .map(([id, t]) => ({ branchId: id, received: t.received, withdrawn: t.withdrawn, left: t.received - t.withdrawn }))
        .filter((b) => b.received > 0.005 || b.withdrawn > 0.005)
        .sort((a, b) => b.received - a.received),
      byMethod,
      pending: {
        customerDue,
        codWithCourier,
        vendorDue,
        total: customerDue + codWithCourier,
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
