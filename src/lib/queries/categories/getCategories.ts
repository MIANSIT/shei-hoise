import { supabase } from "@/lib/supabase";

export async function getCategoriesQuery(
  storeId: string,
  options?: {
    search?: string;
    page?: number;
    pageSize?: number;
    status?: boolean | null; // Change to boolean or null for "all"
  }
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

  // Add status filtering logic
  if (options?.status !== undefined && options?.status !== null) {
    // Only filter if status is explicitly true or false
    query = query.eq("is_active", options.status);
  }
  // If status is null or undefined, show all (no filter applied)

  if (options?.page !== undefined && options?.pageSize) {
    const from = (options.page - 1) * options.pageSize;
    const to = from + options.pageSize - 1;
    query = query.range(from, to);
  }

  return query;
}
