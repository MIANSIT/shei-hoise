"use server";

import { createClient } from "@/lib/supabase/server";
import { getStoreFeatureSubscription } from "@/lib/utils/getStoreFeatureSubscription";
import { checkLimit } from "@/lib/utils/planFeatures";

export interface MonthlyOrderUsage {
  current: number;
  limit: number; // -1 means unlimited
}

/** Informational only — never used to block order creation, see getStoreFeatureSubscription docs. */
export async function getMonthlyOrderUsage(storeId: string): Promise<MonthlyOrderUsage> {
  const supabase = createClient();
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const { count } = await supabase
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("store_id", storeId)
    .gte("created_at", startOfMonth.toISOString());

  const subscription = await getStoreFeatureSubscription(storeId);
  const { limit } = checkLimit(subscription, "max_orders_per_month", 0);

  return { current: count ?? 0, limit };
}
