// lib/getallStores.ts
import { supabase } from "@/lib/supabase";

export interface Store {
  id: string;
  store_name: string;
  store_slug: string;
  logo_url: string | null;
  description: string | null;
  is_active: boolean;
}

export interface StoreResult {
  stores: Store[];
  total: number;
}

/**
 * Fetch all active stores with total count.
 * @param limit Optional number of stores to fetch (for pagination)
 * @param offset Optional offset (for pagination)
 * @returns Object containing array of stores and total count
 */
export async function getAllStores(
  limit?: number,
  offset?: number
): Promise<StoreResult> {
  let query = supabase
    .from("stores")
    .select("id, store_name, store_slug, logo_url, description, is_active", { count: "exact" })
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (limit !== undefined) query = query.limit(limit);
  if (offset !== undefined) query = query.range(offset, (offset ?? 0) + (limit ?? 0) - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error("Error fetching stores:", error);
    return { stores: [], total: 0 };
  }

  return {
    stores: data ?? [],
    total: count ?? 0,
  };
}
