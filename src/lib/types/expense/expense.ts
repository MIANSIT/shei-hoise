// /lib/types/expense/types.ts

export interface ExpenseCategory {
  id: string;
  store_id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  is_default: boolean; // keeps track of default category
  created_at: string;
  updated_at: string;
}

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

// New interface for updating a category
export interface UpdateCategoryInput {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  is_default?: boolean; // <-- added so toggle can update DB
}

// Optional: interface for creating a new category
export interface CreateCategoryInput {
  store_id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  is_default?: boolean; // can default to true or false
}