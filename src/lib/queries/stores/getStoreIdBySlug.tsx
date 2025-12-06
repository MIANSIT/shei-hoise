// lib/queries/stores/getStoreIdBySlug.ts
import { supabase } from "@/lib/supabase";

export async function getStoreIdBySlug(store_slug: string): Promise<string | null> {
  // Add validation for store_slug
  if (!store_slug || store_slug === "undefined") {
    console.error("❌ Invalid store slug provided:", store_slug);
    return null;
  }

  console.log("🔄 Fetching store ID for slug:", store_slug);

  try {
    const { data, error } = await supabase
      .from("stores")
      .select("id")
      .eq("store_slug", store_slug)
      .single();

    if (error) {
      console.error("❌ Error fetching store ID:", {
        message: error.message,
        code: error.code,
        details: error.details,
        slug: store_slug
      });
      return null;
    }

    if (!data) {
      console.error("❌ No store found for slug:", store_slug);
      return null;
    }

    console.log("✅ Store ID found:", data.id);
    return data.id;
  } catch (error) {
    console.error("💥 Unexpected error in getStoreIdBySlug:", error);
    return null;
  }
}