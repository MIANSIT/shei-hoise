// lib/getStoreBySlugWithLogo.ts
import { supabase } from "@/lib/supabase";

export interface StoreWithLogo {
  id: string;
  store_name: string;
  store_slug: string;
  logo_url: string | null;
  description: string | null;
}

export async function getStoreBySlugWithLogo(store_slug: string): Promise<StoreWithLogo | null> {
  const { data, error } = await supabase
    .from("stores")
    .select("id, store_name, store_slug, logo_url, description")
    .eq("store_slug", store_slug)
    .single();

  if (error) {
    console.error("Error fetching store info:", error);
    return null;
  }

  return data;
}
