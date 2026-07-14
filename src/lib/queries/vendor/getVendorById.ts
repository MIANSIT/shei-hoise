import { supabase } from "@/lib/supabase";
import type { Vendor } from "@/lib/types/vendor/type";

export async function getVendorById(
  id: string,
  storeId: string,
): Promise<Vendor | null> {
  const { data, error } = await supabase
    .from("vendors")
    .select("*")
    .eq("id", id)
    .eq("store_id", storeId)
    .maybeSingle();

  if (error) {
    console.error("Error fetching vendor:", error.message);
    return null;
  }

  return data as Vendor | null;
}
