"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import type { Announcement } from "@/lib/types/announcement";
import { getAuthorizedStoreId } from "@/lib/permissions/server";

/** All of the caller's own announcements (active + inactive), for the Storefront Design admin list. */
export async function getAnnouncementsForAdmin(): Promise<Announcement[]> {
  const storeResult = await getAuthorizedStoreId("storefront.view");
  if (!storeResult.ok) return [];

  const { data, error } = await supabaseAdmin
    .from("store_announcements")
    .select("*")
    .eq("store_id", storeResult.storeId)
    .order("sort_order", { ascending: true });

  if (error || !data) return [];
  return data as Announcement[];
}
