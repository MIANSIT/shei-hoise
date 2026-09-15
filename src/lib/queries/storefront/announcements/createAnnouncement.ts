"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { getAuthenticatedStoreId } from "@/lib/utils/getAuthenticatedStoreId";
import { announcementFieldsSchema, type AnnouncementFieldsType } from "@/lib/schema/announcement.schema";
import type { Announcement } from "@/lib/types/announcement";

// A flat cap, same spirit as MAX_SLIDES/MAX_BANNERS — stops an unbounded
// announcement list from making the ticker unreadably long.
const MAX_ANNOUNCEMENTS = 10;

export async function createAnnouncement(
  fields: AnnouncementFieldsType,
): Promise<{ success: true; announcement: Announcement } | { success: false; error: string }> {
  const storeResult = await getAuthenticatedStoreId();
  if (!storeResult.ok) return { success: false, error: storeResult.error };
  const storeId = storeResult.storeId;

  const payload = announcementFieldsSchema.parse(fields);

  const { count: currentCount } = await supabaseAdmin
    .from("store_announcements")
    .select("id", { count: "exact", head: true })
    .eq("store_id", storeId);

  if ((currentCount ?? 0) >= MAX_ANNOUNCEMENTS) {
    return { success: false, error: `You can have up to ${MAX_ANNOUNCEMENTS} announcements.` };
  }

  const { data: maxSort } = await supabaseAdmin
    .from("store_announcements")
    .select("sort_order")
    .eq("store_id", storeId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextSortOrder = (maxSort?.sort_order ?? -1) + 1;

  const { data, error } = await supabaseAdmin
    .from("store_announcements")
    .insert({
      store_id: storeId,
      text: payload.text,
      is_active: payload.is_active,
      sort_order: nextSortOrder,
    })
    .select("*")
    .single();

  if (error || !data) {
    return { success: false, error: error?.message ?? "Failed to save announcement" };
  }

  return { success: true, announcement: data as Announcement };
}
