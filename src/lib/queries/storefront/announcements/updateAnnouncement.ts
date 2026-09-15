"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { getAuthenticatedStoreId } from "@/lib/utils/getAuthenticatedStoreId";
import { announcementFieldsSchema, type AnnouncementFieldsType } from "@/lib/schema/announcement.schema";
import type { Announcement } from "@/lib/types/announcement";

export async function updateAnnouncement(
  announcementId: string,
  fields: AnnouncementFieldsType,
): Promise<{ success: true; announcement: Announcement } | { success: false; error: string }> {
  const storeResult = await getAuthenticatedStoreId();
  if (!storeResult.ok) return { success: false, error: storeResult.error };
  const storeId = storeResult.storeId;

  // announcementId is caller-supplied — only allow editing a row that
  // actually belongs to the caller's own store.
  const { data: existing, error: fetchError } = await supabaseAdmin
    .from("store_announcements")
    .select("id, store_id")
    .eq("id", announcementId)
    .maybeSingle();

  if (fetchError || !existing) return { success: false, error: "Announcement not found" };
  if (existing.store_id !== storeId) return { success: false, error: "You do not have permission to edit this announcement" };

  const payload = announcementFieldsSchema.parse(fields);

  const { data, error } = await supabaseAdmin
    .from("store_announcements")
    .update({
      text: payload.text,
      is_active: payload.is_active,
      updated_at: new Date().toISOString(),
    })
    .eq("id", announcementId)
    .eq("store_id", storeId)
    .select("*")
    .single();

  if (error || !data) {
    return { success: false, error: error?.message ?? "Failed to update announcement" };
  }

  return { success: true, announcement: data as Announcement };
}
