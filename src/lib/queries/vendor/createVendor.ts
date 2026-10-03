"use server";
import { supabaseAdmin as supabase } from "@/lib/supabase/admin";
import { Vendor, VendorFormValues } from "@/lib/types/vendor/type";
import { authorizeForStore, logActivity } from "@/lib/permissions/server";

export interface CreateVendorInput extends VendorFormValues {
  store_id: string;
}

export async function createVendor(
  input: CreateVendorInput,
): Promise<Vendor | null> {
  try {
    const auth = await authorizeForStore(input.store_id, "vendors.add");
    if (!auth.ok) {
      console.error("createVendor:", auth.error);
      return null;
    }

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

    await logActivity(auth.actor, {
      action: "vendors.add",
      entityType: "vendor",
      entityId: data.id,
      summary: `Added vendor ${data.name ?? ""}`.trim(),
    });

    return data as Vendor;
  } catch (err) {
    console.error("Exception in createVendor:", err);
    return null;
  }
}
