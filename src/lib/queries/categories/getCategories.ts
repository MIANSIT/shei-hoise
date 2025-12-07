import { supabase } from "@/lib/supabase";

interface CategoryQueryParams {
  storeId: string;
  search?: string;
  page?: number;
  limit?: number;
}

export async function getCategoriesQuery({
  storeId,
  search,
  page,
  limit,
}: CategoryQueryParams) {
  let query = supabase
    .from("categories")
    .select("id,name,slug,description,parent_id,is_active,created_at", {
      count: "exact",
    })
    .eq("store_id", storeId)
    .order("created_at", { ascending: false });

  // Apply search if provided
  if (search && search.trim() !== "") {
    query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
  }

  // Apply pagination if provided
  if (page && limit) {
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);
  }

  return query;
}
