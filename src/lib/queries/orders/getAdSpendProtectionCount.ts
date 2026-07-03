import { supabase } from "@/lib/supabase";

/** Count of orders in the period whose Facebook Purchase event was held or
 * suppressed due to a high-risk phone number — i.e. ad spend protected from
 * being optimized around a fake/cancelled order. */
export async function getAdSpendProtectionCount(storeId: string, since: string): Promise<number> {
  const { count } = await supabase
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("store_id", storeId)
    .gte("created_at", since)
    .in("fb_purchase_event_status", ["held", "suppressed"]);

  return count ?? 0;
}
