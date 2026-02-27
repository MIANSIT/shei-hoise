import type { Dayjs } from "dayjs";

// ─── Category ─────────────────────────────────────────────────────────────────

export interface ExpenseCategory {
  id: string;
  store_id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
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
  is_default?: boolean;
  is_active?: boolean;
}

export interface UpdateCategoryInput {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
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
  platform?: string;
  notes?: string;
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
  platform?: string;
  vendor_name?: string;
  notes?: string;
}
