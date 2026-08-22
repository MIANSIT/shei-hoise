import { supabase } from "@/lib/supabase";
import { ExpenseCategory } from "@/lib/types/expense/type";

interface GetCategoriesParams {
  storeId: string;
  page?: number;
  pageSize?: number;
  search?: string;
}

interface GetCategoriesResponse {
  data: ExpenseCategory[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export async function getExpenseCategories({
  storeId,
  page = 1,
  pageSize = 12,
  search = "",
}: GetCategoriesParams): Promise<GetCategoriesResponse> {
  if (!storeId) {
    return {
      data: [],
      total: 0,
      page,
      pageSize,
      totalPages: 0,
    };
  }

  try {
    // Calculate range for pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    // Build the base query
    // Every store has its own copy of the "default" categories (one row per
    // store, is_default just marks it as protected from deletion) — this
    // must never match another store's rows just because is_default is true.
    let query = supabase
      .from("expense_categories")
      .select("*", { count: "exact" }) // Fixed: changed countType to count
      .eq("store_id", storeId);

    // Add search filter if provided
    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    }

    // Add ordering and pagination
    const { data, error, count } = await query
      .order("is_default", { ascending: false })
      .order("name", { ascending: true })
      .range(from, to);

    if (error) {
      console.error("Error fetching categories:", error.message);
      throw new Error(error.message);
    }

    const totalPages = count ? Math.ceil(count / pageSize) : 0;

    return {
      data: (data || []) as ExpenseCategory[],
      total: count || 0,
      page,
      pageSize,
      totalPages,
    };
  } catch (err) {
    console.error("Unexpected error in getExpenseCategories:", err);
    throw err;
  }
}
