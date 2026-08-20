"use server";

import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

interface DismissResult {
  success: boolean;
  message?: string;
}

export async function dismissStoreSetupPrompt(
  storeId: string,
): Promise<DismissResult> {
  try {
    const supabase = createClient();
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();
    if (sessionError) return { success: false, message: sessionError.message };
    if (!session) return { success: false, message: "You must be logged in." };

    const { data: store, error: storeError } = await supabaseAdmin
      .from("stores")
      .select("id, owner_id")
      .eq("id", storeId)
      .single();

    if (storeError || !store) {
      return { success: false, message: "Store not found." };
    }

    if (store.owner_id !== session.user.id) {
      return { success: false, message: "You do not own this store." };
    }

    const { error: updateError } = await supabaseAdmin
      .from("stores")
      .update({ setup_completed_at: new Date().toISOString() })
      .eq("id", storeId);

    if (updateError) {
      return { success: false, message: updateError.message };
    }

    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return { success: false, message };
  }
}
