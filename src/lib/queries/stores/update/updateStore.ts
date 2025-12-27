import { supabase } from "@/lib/supabase";
import type { UpdatedStoreData, StoreData } from "@/lib/types/store/store";

export async function updateStore(
  storeId: string,
  payload: UpdatedStoreData
): Promise<StoreData | null> {
  if (!storeId) return null;

  const {
    store_name,
    store_slug,
    description,
    logo_url,
    banner_url,
    is_active,
    status,
    contact_email,
    contact_phone,
    business_address,
    tax_id,
    business_license,
  } = payload;

  const { data, error } = await supabase
    .from("stores")
    .update({
      store_name,
      store_slug,
      description,
      logo_url,
      banner_url,
      is_active,
      status,
      contact_email,
      contact_phone,
      business_address,
      tax_id,
      business_license,
      updated_at: new Date().toISOString(),
    })
    .eq("id", storeId)
    .select("*")
    .single();

  if (error) {
    console.error("Error updating store:", error);
    return null;
  }

  return data;
}
