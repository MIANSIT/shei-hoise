import { supabase } from "@/lib/supabase";
import type { Expense } from "@/lib/types/expense/type";

export interface ExpenseQueryParams {
  storeId: string;
  search?: string;
  categoryId?: string | null;
  paymentMethod?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
  page?: number;
  pageSize?: number;
}

export interface ExpenseQueryResult {
  data: Expense[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export async function getExpensesWithCategory(
  params: ExpenseQueryParams,
): Promise<ExpenseQueryResult> {
  const {
    storeId,
    search,
    categoryId,
    paymentMethod,
    dateFrom,
    dateTo,
    page = 1,
    pageSize = 20,
  } = params;

  if (!storeId) {
    return { data: [], total: 0, page: 1, pageSize, totalPages: 0 };
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("expenses")
    .select(`*, category:expense_categories(*)`, { count: "exact" })
    .eq("store_id", storeId)
    .order("expense_date", { ascending: false })
    .range(from, to);

  if (search?.trim()) {
    const term = `%${search.trim()}%`;
    query = query.or(
      `title.ilike."${term}",vendor_name.ilike."${term}",description.ilike."${term}"`,
    );
  }

  if (categoryId) {
    query = query.eq("category_id", categoryId);
  }

  if (paymentMethod) {
    query = query.eq("payment_method", paymentMethod);
  }

  if (dateFrom) {
    query = query.gte("expense_date", dateFrom);
  }

  if (dateTo) {
    query = query.lte("expense_date", dateTo);
  }

  const { data, error, count } = await query;

  if (error) {
    console.error(
      "Error fetching expenses:",
      error.message,
      error.details,
      error.hint,
    );
    return { data: [], total: 0, page, pageSize, totalPages: 0 };
  }

  const total = count ?? 0;

  return {
    data: (data as Expense[]) ?? [],
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}
