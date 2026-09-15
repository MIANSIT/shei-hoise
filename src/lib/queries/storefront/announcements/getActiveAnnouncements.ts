import { supabase } from "@/lib/supabase";
import type { Announcement } from "@/lib/types/announcement";

/** Public: active announcement lines for a store's announcement bar, ordered for display. Any anonymous visitor can call this. */
export async function getActiveAnnouncements(storeId: string): Promise<Announcement[]> {
  const { data, error } = await supabase
    .from("store_announcements")
    .select("*")
    .eq("store_id", storeId)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error || !data) return [];
  return data as Announcement[];
}
