// lib/queries/stores/getStoreBySlug.ts
import { supabase } from "@/lib/supabase";

export interface StoreData {
  id: string;
  store_name: string;
  store_slug: string;
  description: string | null;
  logo_url: string | null;
  banner_url: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  business_address: string | null;
  business_license: string | null;
  tax_id: string | null;
  status: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export async function getStoreBySlug(store_slug: string): Promise<StoreData | null> {
  try {
    const { data, error } = await supabase
      .from("stores")
      .select("*")
      .eq("store_slug", store_slug)
      .eq("is_active", true)
      .single();

    if (error) {
      console.error("Error fetching store data:", error);
      return null;
    }

    if (!data) {
      console.error("No store found for slug:", store_slug);
      return null;
    }

    return data;
  } catch (error) {
    console.error("Error in getStoreBySlug:", error);
    return null;
  }
}