"use server";
import { supabaseAdmin as supabase } from "@/lib/supabase/admin";
import { Vendor, VendorFormValues } from "@/lib/types/vendor/type";
import { authorizeForStore } from "@/lib/permissions/server";

export interface UpdateVendorInput extends Partial<VendorFormValues> {
  id: string;
  store_id: string;
}

export async function updateVendor(
  input: UpdateVendorInput,
): Promise<Vendor | null> {
  try {
    const { id, store_id, ...rest } = input;

    const auth = await authorizeForStore(store_id, "vendors.edit");
    if (!auth.ok) {
      console.error("updateVendor:", auth.error);
      return null;
    }
    const sanitized = Object.fromEntries(
      Object.entries(rest).filter(([, v]) => v !== undefined),
    );

    const { data, error } = await supabase
      .from("vendors")
      .update({ ...sanitized, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("store_id", store_id)
      .select("*")
      .single();

    if (error) {
      console.error("Error updating vendor:", error.message);
      return null;
    }

    return data as Vendor;
  } catch (err) {
    console.error("Exception in updateVendor:", err);
    return null;
  }
}
