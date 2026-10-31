import type { Dayjs } from "dayjs";
import type { ExpenseKind } from "@/lib/utils/accounting";

// ─── Category ─────────────────────────────────────────────────────────────────

export interface ExpenseCategory {
  id: string;
  store_id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  /**
   * How this category behaves in the books: "operating" is a running cost and
   * is the only kind Profit & Loss subtracts; "inventory" is stock buying (cash
   * out, never a cost of the period's sales); "owner_draw" is profit share.
   * See lib/utils/accounting.ts. Absent on a database that predates the column.
   */
  kind?: ExpenseKind;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateCategoryInput {
  store_id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  kind?: ExpenseKind;
  is_default?: boolean;
  is_active?: boolean;
}

export interface UpdateCategoryInput {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  kind?: ExpenseKind;
  is_default?: boolean;
  is_active?: boolean;
}

// ─── Expense ──────────────────────────────────────────────────────────────────

export interface Expense {
  id: string;
  store_id: string;
  category_id: string;
  amount: number;
  title: string;
  description?: string;
  expense_date: string;
  vendor_name?: string;
  payment_method?: string;
  /** "shop" = paid from the shop's own money (counted in Money Overview); "outside" = investor or the owner's pocket. */
  paid_from?: "shop" | "outside" | null;
  platform?: string;
  notes?: string;
  /** Stores with branches: the branch that carries this expense. */
  branch_id?: string | null;
  created_at: string;
  updated_at: string;
  category?: ExpenseCategory;
}

// ─── Form ─────────────────────────────────────────────────────────────────────

export interface ExpenseFormValues {
  title: string;
  amount: number;
  expense_date: Dayjs;
  category_id?: string;
  description?: string;
  payment_method?: string;
  paid_from?: "shop" | "outside";
  platform?: string;
  vendor_name?: string;
  notes?: string;
  branch_id?: string;
}
