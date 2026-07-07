"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";

/** Delete-by-id is identical regardless of which courier the account belongs to. */
export async function disconnectCourierAccount(
  credentialId: string,
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabaseAdmin
    .from("store_courier_credentials")
    .delete()
    .eq("id", credentialId);

  if (error) {
    console.error("Error disconnecting courier account:", error);
    return { success: false, error: "Failed to disconnect" };
  }

  return { success: true };
}
