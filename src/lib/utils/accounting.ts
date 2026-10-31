/**
 * The one place the platform's accounting terms are defined.
 *
 * Two views of the same business, deliberately kept apart:
 *
 * **Sales (trading / Profit & Loss)** — did selling make money this period?
 *   Sales            every order that wasn't cancelled or returned, paid or
 *                    not: items − discount + extra charges. Shipping and tax
 *                    are collected to be passed on, so they are not sales.
 *   Received         the paid part of Sales.  To collect = Sales − Received.
 *   COGS             what the goods sold in those orders cost the shop.
 *   Gross profit     Sales − COGS (the dashboard's gross profit also nets off
 *                    the delivery gap; the P&L page shows that line on its own).
 *   Operating costs  the period's running costs: ads, rent, packaging, salary,
 *                    fees, delivery shortfall. **Buying stock is not one.**
 *   Net profit       Gross profit + vendor profit − operating costs.
 *
 * **Accounts (cash and standing)** — where does the business actually stand?
 *   Cash in          money that arrived: order payments, due collections,
 *                    vendor payments.
 *   Cash out         money that left: stock buying (supplier payments and
 *                    inventory-kind expenses), operating costs, refunds,
 *                    owner withdrawals.
 *   Stock at cost    unsold goods on the shelf, valued at what they cost.
 *   Owed to you      customer dues + COD still with the courier + vendor dues.
 *   You owe          supplier bills not yet paid.
 *   Business worth   cash + stock at cost + owed to you − you owe.
 *
 * Why the split matters: buying stock is not a cost of this period's sales. It
 * turns cash into stock, and reaches profit only as COGS on the day each item
 * sells. Counting a restock as an expense charges the goods twice — once when
 * bought, once when sold — and shows a profitable shop as a loss-making one.
 * Owner profit share is a split of profit already made, not a cost of making it.
 */

/** How an expense category behaves in the books. Mirrors expense_categories.kind. */
export type ExpenseKind = "operating" | "inventory" | "owner_draw";

export const EXPENSE_KINDS: readonly ExpenseKind[] = ["operating", "inventory", "owner_draw"];

/** A stored kind as a known value — anything unexpected reads as a running cost. */
export function normalizeExpenseKind(raw: string | null | undefined): ExpenseKind {
  const key = String(raw ?? "").trim().toLowerCase();
  return (EXPENSE_KINDS as readonly string[]).includes(key) ? (key as ExpenseKind) : "operating";
}

// Same patterns as the backfill in 20261107000000_expense_category_kinds.sql,
// kept in sync so a database that predates the column still classifies the
// standard category names the same way.
const INVENTORY_NAME = /(product|stock|inventory|goods)\s*(re)?\s*purchas|(re)?purchas(e|ing)\s*(of\s*)?(product|stock|goods)|^(re)?stock(ing)?$|(buy|buying)\s*stock|পণ্য ক্রয়|মাল ক্রয়|স্টক ক্রয়/i;
const OWNER_DRAW_NAME = /profit\s*share|owner'?s?\s*(draw|drawing|withdraw)|^(draw|drawings|withdrawal)s?$|লভ্যাংশ|মুনাফা/i;

/**
 * The kind a category name implies. Only used when the database doesn't have
 * `expense_categories.kind` yet — once it does, the stored value wins, because
 * the owner can correct it there and a free-text name can't be trusted.
 * @returns the inferred kind
 */
export function inferExpenseKind(name: string | null | undefined): ExpenseKind {
  const text = String(name ?? "");
  if (INVENTORY_NAME.test(text)) return "inventory";
  if (OWNER_DRAW_NAME.test(text)) return "owner_draw";
  return "operating";
}

/** Expense money for one period, split the way the two views need it. */
export interface ExpenseSplit {
  /** Running costs — the only expenses Profit & Loss subtracts. */
  operating: number;
  /** Stock bought through an expense entry: cash out, never a P&L cost. */
  inventory: number;
  /** Profit share / owner drawings: a split of profit, not a cost. */
  ownerDraw: number;
  /** Number of operating entries (what "N expense records" counts). */
  operatingCount: number;
}

export const EMPTY_EXPENSE_SPLIT: ExpenseSplit = {
  operating: 0,
  inventory: 0,
  ownerDraw: 0,
  operatingCount: 0,
};

/**
 * Net profit, the one formula every page must use.
 * @returns gross profit + vendor profit − operating costs − the delivery gap
 */
export function netProfitOf(input: {
  grossProfit: number;
  operatingExpenses: number;
  vendorProfit?: number;
  /** P&L page only: courier cost beyond the delivery charge. The dashboard's gross profit already nets it off. */
  deliveryNetCost?: number;
}): number {
  return (
    input.grossProfit +
    (input.vendorProfit ?? 0) -
    input.operatingExpenses -
    (input.deliveryNetCost ?? 0)
  );
}

/**
 * What the business is worth on paper right now.
 * @returns cash + stock at cost + what's owed to the shop − what the shop owes
 */
export function businessWorthOf(input: {
  cash: number;
  stockAtCost: number;
  owedToYou: number;
  youOwe: number;
}): number {
  return input.cash + input.stockAtCost + input.owedToYou - input.youOwe;
}
