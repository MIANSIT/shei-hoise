"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { getAuthenticatedStoreId } from "@/lib/utils/getAuthenticatedStoreId";

export async function deleteAnnouncement(announcementId: string): Promise<{ success: boolean; error?: string }> {
  const storeResult = await getAuthenticatedStoreId();
  if (!storeResult.ok) return { success: false, error: storeResult.error };

  const { data: existing, error: fetchError } = await supabaseAdmin
    .from("store_announcements")
    .select("id, store_id")
    .eq("id", announcementId)
    .maybeSingle();

  if (fetchError || !existing) return { success: false, error: "Announcement not found" };
  if (existing.store_id !== storeResult.storeId) {
    return { success: false, error: "You do not have permission to delete this announcement" };
  }

  const { error } = await supabaseAdmin
    .from("store_announcements")
    .delete()
    .eq("id", announcementId)
    .eq("store_id", storeResult.storeId);

  if (error) return { success: false, error: error.message };

  return { success: true };
}
