"use server";

import { createCategorySchema, type CreateCategoryType } from "@/lib/schema/category.schema";
import { createClient } from "@/lib/supabase/server";
import { checkLimit } from "@/lib/utils/planFeatures";
import { getStoreFeatureSubscription } from "@/lib/utils/getStoreFeatureSubscription";

export async function createCategory(data: CreateCategoryType, store_id: string) {
  const supabase = createClient();
  const payload = createCategorySchema.parse(data);

  const { count: currentCategoryCount } = await supabase
    .from("categories")
    .select("id", { count: "exact", head: true })
    .eq("store_id", store_id);

  const subscription = await getStoreFeatureSubscription(store_id);
  const limitCheck = checkLimit(subscription, "max_categories", currentCategoryCount ?? 0);
  if (!limitCheck.allowed) {
    throw new Error(
      `You've reached your plan's limit of ${limitCheck.limit} categories. Upgrade your plan to add more.`,
    );
  }

  const { data: insertData, error } = await supabase
    .from("categories")
    .insert({
      ...payload,
      store_id,
    })
    .select("id")
    .single();

  if (error) {
    console.error("Category insert error:", error);
    throw error;
  }

  return { success: true, id: insertData.id };
}
