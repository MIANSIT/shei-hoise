import { getSupplierBills } from "@/lib/queries/supplier/supplierBills";
import { getCustomersWithDue } from "@/lib/queries/customers/getCustomersWithDue";
import { getUnsettledCodOrders } from "@/lib/queries/orders/codSettlements";
import type { CashPosition } from "@/lib/queries/financial/moneyBookTypes";

export type MoneyAlertKind = "billsOverdue" | "billsDueSoon" | "oldDues" | "codStuck" | "negativeCash";

/** One thing about the shop's money that needs a look: how many items, how much money, and where to fix it. */
export interface MoneyAlert {
  kind: MoneyAlertKind;
  count: number;
  /** Money involved (for negative cash: how far below zero). */
  amount: number;
  href: string;
  severity: "danger" | "warning";
}

/** A customer due this old (in days) is flagged. */
export const OLD_DUE_DAYS = 30;
/** Delivered COD cash still with the courier this long (in days) is flagged. */
export const COD_STUCK_DAYS = 7;
/** A supplier bill due within this many days counts as due soon (the Supplier Bills page uses the same 7). */
export const BILL_SOON_DAYS = 7;

const EPSILON = 0.005;

/** The store's today (Asia/Dhaka) as YYYY-MM-DD. */
function dhakaToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

const dayNumber = (isoDate: string): number => Math.floor(Date.parse(`${isoDate.slice(0, 10)}T00:00:00Z`) / 86_400_000);

interface LoadMoneyAlertsArgs {
  storeId: string;
  /** Stores with branches: one branch's customer dues, COD and supplier bills (the bills for goods it received). */
  branchId: string | null;
  withBranches: boolean;
  /** Which sources the person may see; a source they may not see is skipped, not shown as zero. */
  canSeeBills: boolean;
  canSeeDues: boolean;
  canSeeCod: boolean;
  /** Owner only; null for everyone else or before an opening balance is saved. */
  cash: CashPosition | null;
}

/**
 * Money alerts for the dashboard: supplier bills overdue or due soon, customer dues older than
 * 30 days, delivered COD cash waiting more than 7 days with a courier, and cash that has gone
 * below zero. Each source is read on its own, so one that fails or is not allowed leaves the
 * others showing. Only alerts that apply are returned, most urgent first.
 */
export async function loadMoneyAlerts({ storeId, branchId, withBranches, canSeeBills, canSeeDues, canSeeCod, cash }: LoadMoneyAlertsArgs): Promise<MoneyAlert[]> {
  const today = dayNumber(dhakaToday());
  const alerts: MoneyAlert[] = [];

  const bills = async () => {
    if (!canSeeBills) return;
    const result = await getSupplierBills(storeId, branchId);
    if (!result.success) return;
    const overdue = result.rows.filter((r) => r.left > EPSILON && r.overdue);
    const soon = result.rows.filter((r) => {
      if (r.left <= EPSILON || r.overdue || !r.dueDate) return false;
      const days = dayNumber(r.dueDate) - today;
      return days >= 0 && days <= BILL_SOON_DAYS;
    });
    if (overdue.length > 0) {
      alerts.push({ kind: "billsOverdue", count: overdue.length, amount: overdue.reduce((s, r) => s + r.left, 0), href: "/dashboard/stock/bills", severity: "danger" });
    }
    if (soon.length > 0) {
      alerts.push({ kind: "billsDueSoon", count: soon.length, amount: soon.reduce((s, r) => s + r.left, 0), href: "/dashboard/stock/bills", severity: "warning" });
    }
  };

  const dues = async () => {
    if (!canSeeDues) return;
    const rows = await getCustomersWithDue(storeId, branchId, withBranches);
    const old = rows.filter((r) => r.total_due > EPSILON && today - dayNumber(r.oldest_due_date) > OLD_DUE_DAYS);
    if (old.length > 0) {
      alerts.push({ kind: "oldDues", count: old.length, amount: old.reduce((s, r) => s + r.total_due, 0), href: "/dashboard/customers/dues", severity: "warning" });
    }
  };

  const cod = async () => {
    if (!canSeeCod) return;
    const orders = await getUnsettledCodOrders(storeId, null, branchId);
    const stuck = orders.filter((o) => o.due_remaining > EPSILON && today - dayNumber(o.order_date) > COD_STUCK_DAYS);
    if (stuck.length > 0) {
      alerts.push({ kind: "codStuck", count: stuck.length, amount: stuck.reduce((s, o) => s + o.due_remaining, 0), href: "/dashboard/cod-settlements", severity: "warning" });
    }
  };

  // Each source on its own: a failure in one never hides the rest.
  await Promise.all([bills, dues, cod].map((run) => run().catch((err) => console.error("Money alert source failed:", err))));

  if (cash) {
    const below = cash.methods.filter((m) => m.left < -EPSILON);
    if (below.length > 0) {
      alerts.push({
        kind: "negativeCash",
        count: below.length,
        amount: below.reduce((s, m) => s + Math.abs(m.left), 0),
        href: "/dashboard/financial/money-book",
        severity: "danger",
      });
    }
  }

  const rank: Record<MoneyAlertKind, number> = { negativeCash: 0, billsOverdue: 1, billsDueSoon: 2, codStuck: 3, oldDues: 4 };
  return alerts.sort((a, b) => rank[a.kind] - rank[b.kind]);
}
