"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";

export async function selectPathaoStore(
  credentialId: string,
  pathaoStoreId: number,
  pathaoStoreName: string,
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabaseAdmin
    .from("store_pathao_credentials")
    .update({
      pathao_store_id: pathaoStoreId,
      pathao_store_name: pathaoStoreName,
      connected_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", credentialId);

  if (error) {
    console.error("Error selecting Pathao store:", error);
    return { success: false, error: "Failed to save the selected store" };
  }

  return { success: true };
}
