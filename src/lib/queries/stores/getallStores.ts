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

export async function getAllStores(): Promise<Store[]> {
  const { data, error } = await supabase
    .from("stores")
    .select("id, store_name, store_slug, logo_url, description, is_active")
    .eq("is_active", true) // only fetch active stores
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching all stores:", error);
    return [];
  }

  if (!data || data.length === 0) {
    console.warn("No active stores found");
    return [];
  }

  return data;
}
