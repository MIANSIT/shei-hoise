import { supabase } from "@/lib/supabase";

export async function getCategoriesQuery(
  storeId: string,
  options?: { search?: string; page?: number; pageSize?: number }
) {
  let query = supabase
    .from("categories")
    .select("id,name,slug,description,parent_id,is_active,created_at", {
      count: "exact",
    })
    .eq("store_id", storeId)
    .order("created_at", { ascending: false });

  if (options?.search) {
    query = query.ilike("name", `%${options.search}%`);
  }

  if (options?.page !== undefined && options?.pageSize) {
    const from = (options.page - 1) * options.pageSize;
    const to = from + options.pageSize - 1;
    query = query.range(from, to);
  }

  return query;
}
