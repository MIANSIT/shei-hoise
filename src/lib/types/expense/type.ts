export interface ExpenseCategory {
  id: string;
  store_id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  is_default: boolean;
  is_active: boolean; // ✅ added
  created_at: string;
  updated_at: string;
}

export interface UpdateCategoryInput {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  is_default?: boolean;
  is_active?: boolean; // ✅ added
}

export interface CreateCategoryInput {
  store_id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  is_default?: boolean;
  is_active?: boolean; // ✅ added
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
