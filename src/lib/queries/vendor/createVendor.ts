"use server";
import { supabaseAdmin as supabase } from "@/lib/supabase/admin";
import { Vendor, VendorFormValues } from "@/lib/types/vendor/type";

export interface CreateVendorInput extends VendorFormValues {
  store_id: string;
}

export async function createVendor(
  input: CreateVendorInput,
): Promise<Vendor | null> {
  try {
    const sanitized = Object.fromEntries(
      Object.entries(input).filter(([, v]) => v !== undefined && v !== null && v !== ""),
    );

    const { data, error } = await supabase
      .from("vendors")
      .insert([sanitized])
      .select("*")
      .single();

    if (error) {
      console.error("Error creating vendor:", error.message);
      return null;
    }

    return data as Vendor;
  } catch (err) {
    console.error("Exception in createVendor:", err);
    return null;
  }
}
