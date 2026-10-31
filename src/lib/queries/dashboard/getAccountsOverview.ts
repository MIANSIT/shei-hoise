import { getMoneyOverview, type MoneyMethodRow } from "@/lib/queries/financial/getMoneyOverview";
import { getExpenseBreakdown } from "@/lib/queries/expense/getExpenseBreakdown";
import { getStockValueAtCost, type StockValueAtCost } from "@/lib/queries/stock/getStockValueAtCost";
import { getSupplierBalances } from "@/lib/queries/supplier/supplierLedger";
import { businessWorthOf } from "@/lib/utils/accounting";
import { getAllTimeRange } from "@/lib/utils/dashboardPeriods";

/** Money that arrived in the period. */
export interface AccountsCashIn {
  /** Orders paid at the sale or settled by the courier. */
  orders: number;
  /** Customer due collections and part-payments. */
  dueCollections: number;
  /** Payments from vendors. */
  vendorPayments: number;
  total: number;
}

/** Money that left in the period. */
export interface AccountsCashOut {
  /** Buying stock: supplier payments plus expenses filed under a stock-buying category. */
  stockBuying: { supplierPayments: number; inventoryExpenses: number; total: number };
  /** Running costs paid from the shop's money. */
  operatingExpenses: number;
  /** Profit share / drawings filed as an expense. */
  ownerDrawExpenses: number;
  /** Given back to customers. */
  refunds: number;
  /** What the owner took out for themselves (owner view only). */
  ownerWithdrawals: number;
  total: number;
}

export interface AccountsOverview {
  cashIn: AccountsCashIn;
  cashOut: AccountsCashOut;
  /** Expenses and supplier payments an investor or the owner's pocket paid. Never touches the balances. */
  outsideSpent: number;
  /** What is in hand right now across every payment method — counted over the shop's whole history, not the selected period. */
  cashLeft: number;
  /** Per payment method, biggest first. Period flows, with `left` counted over the whole history. */
  byMethod: MoneyMethodRow[];
  /** Unsold stock at what it cost. */
  stock: StockValueAtCost;
  owedToYou: {
    customerDue: number;
    codWithCourier: number;
    vendorDue: number;
    total: number;
  };
  youOwe: {
    /** Supplier bills not yet paid. Zero when the viewer can't see supplier money. */
    supplierDue: number;
    /** Whether supplier money could be read at all — hides the line rather than showing a false zero. */
    supplierVisible: boolean;
    total: number;
  };
  /** cash + stock at cost + owed to you − you owe. */
  businessWorth: number;
}

const EMPTY: AccountsOverview = {
  cashIn: { orders: 0, dueCollections: 0, vendorPayments: 0, total: 0 },
  cashOut: {
    stockBuying: { supplierPayments: 0, inventoryExpenses: 0, total: 0 },
    operatingExpenses: 0,
    ownerDrawExpenses: 0,
    refunds: 0,
    ownerWithdrawals: 0,
    total: 0,
  },
  outsideSpent: 0,
  cashLeft: 0,
  byMethod: [],
  stock: { units: 0, value: 0, unitsMissingCost: 0 },
  owedToYou: { customerDue: 0, codWithCourier: 0, vendorDue: 0, total: 0 },
  youOwe: { supplierDue: 0, supplierVisible: false, total: 0 },
  businessWorth: 0,
};

/**
 * Where the business stands: cash in and out over the period, what is in hand
 * now, the stock it is sitting on, and who owes whom.
 *
 * This is the cash-and-standing half of the books — the other half is the
 * trading result on the Sales view. Buying stock belongs here and nowhere
 * else: it is cash turning into stock, not a cost of the period's sales (see
 * accounting.ts).
 *
 * Built from the same queries the Money and Vendors pages use, so the figures
 * match those pages rather than being a second opinion.
 * @returns the overview, or zeros when the underlying queries fail
 */
export async function getAccountsOverview(
  storeId: string,
  fromDate: string,
  toDate: string,
  /** Stores with branches: one branch. Omitted/null = the whole store. */
  branchId?: string | null,
  /** Whether the store uses branches (changes how customer dues are read). */
  withBranches = false,
  /** Owner only: withdrawals and supplier money are theirs to see. */
  isOwner = false,
): Promise<AccountsOverview> {
  if (!storeId) return EMPTY;

  try {
    // Flows are the selected period; what is in hand is a balance and must
    // count every day the shop has traded, however short the window shown.
    const allTime = getAllTimeRange();
    const periodIsAllTime = fromDate <= allTime.fromDate && toDate >= allTime.toDate;

    const [money, lifetimeMoney, shopExpenses, stock, supplierBalances] = await Promise.all([
      getMoneyOverview(storeId, fromDate, toDate, branchId ?? null, withBranches, isOwner),
      periodIsAllTime
        ? Promise.resolve(null)
        : getMoneyOverview(
            storeId,
            allTime.fromDate,
            allTime.toDate,
            branchId ?? null,
            withBranches,
            isOwner,
          ),
      // Only what the shop itself paid: an investor's money never left these balances.
      getExpenseBreakdown(storeId, fromDate, toDate, null, null, branchId ?? null, "shop"),
      getStockValueAtCost(storeId, branchId ?? null),
      getSupplierBalances(storeId).catch(() => ({})),
    ]);
    const balances = lifetimeMoney ?? money;

    const supplierPayments = money.spentBreakdown.suppliers;
    const inventoryExpenses = shopExpenses.current.inventory;
    const operatingExpenses = shopExpenses.current.operating;
    const ownerDrawExpenses = shopExpenses.current.ownerDraw;

    const cashIn: AccountsCashIn = {
      orders: money.sources.ordersThisPeriod + money.sources.ordersEarlier,
      dueCollections: money.sources.dueCollections,
      vendorPayments: money.sources.vendorPayments,
      total: money.receivedTotal + money.vendorReceivedTotal,
    };

    const cashOut: AccountsCashOut = {
      stockBuying: {
        supplierPayments,
        inventoryExpenses,
        total: supplierPayments + inventoryExpenses,
      },
      operatingExpenses,
      ownerDrawExpenses,
      refunds: money.refundedTotal,
      ownerWithdrawals: money.withdrawnTotal,
      total:
        supplierPayments +
        inventoryExpenses +
        operatingExpenses +
        ownerDrawExpenses +
        money.refundedTotal +
        money.withdrawnTotal,
    };

    const supplierRows = Object.values(supplierBalances);
    const supplierVisible = supplierRows.length > 0;
    // A supplier overpayment (negative due) is money they owe back, not a debt.
    const supplierDue = supplierRows.reduce((sum, b) => sum + Math.max(b.due, 0), 0);

    // Dues are already live balances, not period figures (see getPendingBalance).
    const owedToYou = {
      customerDue: money.pending.customerDue,
      codWithCourier: money.pending.codWithCourier,
      vendorDue: money.pending.vendorDue,
      total: money.pending.customerDue + money.pending.codWithCourier + money.pending.vendorDue,
    };

    return {
      cashIn,
      cashOut,
      outsideSpent: money.outsideSpentTotal,
      cashLeft: balances.leftTotal,
      byMethod: mergeMethodBalances(money.byMethod, balances.byMethod),
      stock,
      owedToYou,
      youOwe: { supplierDue, supplierVisible, total: supplierDue },
      businessWorth: businessWorthOf({
        cash: balances.leftTotal,
        stockAtCost: stock.value,
        owedToYou: owedToYou.total,
        youOwe: supplierDue,
      }),
    };
  } catch (error) {
    console.error("Failed to load accounts overview:", error);
    return EMPTY;
  }
}

/**
 * The period's money movements per method, with `left` taken from the
 * lifetime figures — so a method shows what it holds now beside what moved
 * through it this period. Methods that only hold money from earlier are kept.
 * @returns one row per method, biggest period total first
 */
function mergeMethodBalances(
  periodRows: MoneyMethodRow[],
  lifetimeRows: MoneyMethodRow[],
): MoneyMethodRow[] {
  if (periodRows === lifetimeRows) return periodRows;
  const leftOf = new Map(lifetimeRows.map((row) => [row.method, row.left]));
  const merged = periodRows.map((row) => ({ ...row, left: leftOf.get(row.method) ?? row.left }));
  const seen = new Set(merged.map((row) => row.method));
  for (const row of lifetimeRows) {
    if (seen.has(row.method) || Math.abs(row.left) <= 0.005) continue;
    // Nothing moved on this method in the period, but it is still holding money.
    merged.push({
      ...row,
      fromOrders: 0,
      fromDues: 0,
      fromVendors: 0,
      total: 0,
      withdrawn: 0,
      movedOut: 0,
      movedIn: 0,
      refunded: 0,
      spent: 0,
    });
  }
  return merged.sort((a, b) => b.total - a.total || b.left - a.left);
}
