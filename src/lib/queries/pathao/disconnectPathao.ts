"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";

export async function disconnectPathao(
  credentialId: string,
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabaseAdmin
    .from("store_pathao_credentials")
    .delete()
    .eq("id", credentialId);

  if (error) {
    console.error("Error disconnecting Pathao:", error);
    return { success: false, error: "Failed to disconnect" };
  }

  return { success: true };
}
