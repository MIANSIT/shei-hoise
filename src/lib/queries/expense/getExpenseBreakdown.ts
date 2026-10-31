import { supabase } from "@/lib/supabase";
import { fetchAllPaged } from "@/lib/queries/utils/fetchAllPaged";
import {
  EMPTY_EXPENSE_SPLIT,
  inferExpenseKind,
  normalizeExpenseKind,
  type ExpenseKind,
  type ExpenseSplit,
} from "@/lib/utils/accounting";

export interface ExpenseCategoryAmount {
  categoryId: string | null;
  name: string;
  kind: ExpenseKind;
  amount: number;
}

export interface ExpenseBreakdown {
  /** This period, split by kind. `operating` is the only figure Profit & Loss subtracts. */
  current: ExpenseSplit;
  /** The previous period, same split, for the change percentages. */
  previous: ExpenseSplit;
  /** Every operating category with money in the period, biggest first — not a top-5 cut. */
  operatingByCategory: ExpenseCategoryAmount[];
  /** Stock buying and owner draws that were filed as expenses, biggest first. Shown on Accounts. */
  nonOperatingByCategory: ExpenseCategoryAmount[];
  /**
   * Day (YYYY-MM-DD) → stock buying and owner draws filed as expenses on it,
   * within the current period. Lets a daily profit trend that was built from
   * every expense add them back without a second query.
   */
  nonOperatingByDay: Map<string, number>;
}

export const EMPTY_EXPENSE_BREAKDOWN: ExpenseBreakdown = {
  current: EMPTY_EXPENSE_SPLIT,
  previous: EMPTY_EXPENSE_SPLIT,
  operatingByCategory: [],
  nonOperatingByCategory: [],
  nonOperatingByDay: new Map(),
};

interface ExpenseRow {
  category_id: string | null;
  amount: number;
  expense_date: string;
}

interface CategoryRow {
  id: string;
  name: string | null;
  kind?: string | null;
}

/**
 * Every category's accounting kind for one store.
 *
 * Reads `expense_categories.kind`, and falls back to reading the names alone
 * when that column isn't in the database yet (see
 * 20261107000000_expense_category_kinds.sql) — PostgREST fails the whole
 * select on one unknown column, so the retry is what keeps the dashboard
 * working on a database where the migration hasn't been run.
 * @returns category id → name and kind
 */
export async function getExpenseCategoryKinds(
  storeId: string,
): Promise<Map<string, { name: string; kind: ExpenseKind }>> {
  const byId = new Map<string, { name: string; kind: ExpenseKind }>();
  if (!storeId) return byId;

  let rows: CategoryRow[] = [];
  let storedKind = true;
  const { data, error } = await supabase
    .from("expense_categories")
    .select("id, name, kind")
    .eq("store_id", storeId);
  if (error) {
    storedKind = false;
    const fallback = await supabase
      .from("expense_categories")
      .select("id, name")
      .eq("store_id", storeId);
    if (fallback.error) {
      console.error("Failed to load expense categories:", fallback.error.message);
      return byId;
    }
    rows = (fallback.data ?? []) as CategoryRow[];
  } else {
    rows = (data ?? []) as CategoryRow[];
  }

  for (const row of rows) {
    const name = row.name ?? "Uncategorized";
    byId.set(row.id, {
      name,
      // The owner can correct a stored kind; a free-text name is only a guess.
      kind: storedKind ? normalizeExpenseKind(row.kind) : inferExpenseKind(name),
    });
  }
  return byId;
}

/**
 * Expenses for a period and the one before it, split into running costs, stock
 * buying and owner draws — the split the dashboard and the Profit & Loss page
 * both work from.
 *
 * Computed here rather than read from `get_dashboard_summary`, which sums every
 * category into one `total_expenses` and only returns the top five by name. The
 * whole point of this query is to keep stock buying out of profit, which needs
 * the full set and each category's kind.
 * @returns the breakdown, or zeros when the query fails
 */
export async function getExpenseBreakdown(
  storeId: string,
  periodStart: string,
  periodEnd: string,
  prevPeriodStart?: string | null,
  prevPeriodEnd?: string | null,
  /** Stores with branches: one branch's expenses. Omitted/null = the whole store. */
  branchId?: string | null,
  /**
   * Whose money paid it. Omitted counts every entry, which is what Profit &
   * Loss wants — a cost is a cost whoever paid it. The Accounts view passes
   * "shop" so only money that actually left the shop's balances is counted.
   */
  paidFrom?: "shop" | "outside",
): Promise<ExpenseBreakdown> {
  if (!storeId) return EMPTY_EXPENSE_BREAKDOWN;

  try {
    const earliest =
      prevPeriodStart && prevPeriodStart < periodStart ? prevPeriodStart : periodStart;
    const latest = prevPeriodEnd && prevPeriodEnd > periodEnd ? prevPeriodEnd : periodEnd;

    const [categories, rows] = await Promise.all([
      getExpenseCategoryKinds(storeId),
      fetchAllPaged<ExpenseRow>((from, to) => {
        let query = supabase
          .from("expenses")
          .select("category_id, amount, expense_date")
          .eq("store_id", storeId)
          .gte("expense_date", earliest)
          .lte("expense_date", latest);
        if (branchId) query = query.eq("branch_id", branchId);
        if (paidFrom) query = query.eq("paid_from", paidFrom);
        return query.order("id").range(from, to) as unknown as PromiseLike<{
          data: ExpenseRow[] | null;
          error: { message: string } | null;
        }>;
      }),
    ]);

    const current: ExpenseSplit = { operating: 0, inventory: 0, ownerDraw: 0, operatingCount: 0 };
    const previous: ExpenseSplit = { operating: 0, inventory: 0, ownerDraw: 0, operatingCount: 0 };
    const byCategory = new Map<string, ExpenseCategoryAmount>();
    const nonOperatingByDay = new Map<string, number>();

    for (const row of rows) {
      const amount = Number(row.amount) || 0;
      if (!amount) continue;
      const date = String(row.expense_date).slice(0, 10);
      const category = row.category_id ? categories.get(row.category_id) : undefined;
      const kind = category?.kind ?? "operating";
      const inCurrent = date >= periodStart && date <= periodEnd;
      const inPrevious =
        !!prevPeriodStart && !!prevPeriodEnd && date >= prevPeriodStart && date <= prevPeriodEnd;

      for (const [bucket, applies] of [
        [current, inCurrent],
        [previous, inPrevious],
      ] as const) {
        if (!applies) continue;
        if (kind === "operating") {
          bucket.operating += amount;
          bucket.operatingCount += 1;
        } else if (kind === "inventory") bucket.inventory += amount;
        else bucket.ownerDraw += amount;
      }

      if (!inCurrent) continue;
      if (kind !== "operating") {
        nonOperatingByDay.set(date, (nonOperatingByDay.get(date) ?? 0) + amount);
      }
      const key = row.category_id ?? "uncategorized";
      const entry =
        byCategory.get(key) ??
        ({
          categoryId: row.category_id ?? null,
          name: category?.name ?? "Uncategorized",
          kind,
          amount: 0,
        } satisfies ExpenseCategoryAmount);
      entry.amount += amount;
      byCategory.set(key, entry);
    }

    const sorted = [...byCategory.values()].sort((a, b) => b.amount - a.amount);
    return {
      current,
      previous,
      operatingByCategory: sorted.filter((c) => c.kind === "operating"),
      nonOperatingByCategory: sorted.filter((c) => c.kind !== "operating"),
      nonOperatingByDay,
    };
  } catch (error) {
    console.error("Failed to load expense breakdown:", error);
    return EMPTY_EXPENSE_BREAKDOWN;
  }
}
