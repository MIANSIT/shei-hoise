// lib/actions/stores/updateStore.ts
"use server";

import { supabase } from "@/lib/supabase";
import { StoreStatus } from "@/lib/types/enums";

type UpdateStoreArgs = {
  storeId: string;
  status?: StoreStatus; // only allow valid enum values
  isActive?: boolean;
};

export async function updateStore({
  storeId,
  status,
  isActive,
}: UpdateStoreArgs) {
  try {
    // Only include the fields that are being updated
    const updates: Partial<{ status: StoreStatus; is_active: boolean }> = {};
    if (status !== undefined) updates.status = status;
    if (isActive !== undefined) updates.is_active = isActive;

    if (Object.keys(updates).length === 0) {
      return { success: false, message: "Nothing to update" };
    }

    const { error, data } = await supabase
      .from("stores")
      .update(updates)
      .eq("id", storeId)
      .select()
      .single();

    if (error) throw error;

    return { success: true, store: data };
  } catch (err) {
    console.error("updateStore failed:", err);
    throw err;
  }
}
