"use server";

import { supabase } from "@/lib/supabase";

export async function getCategories() {
  try {
    const { data, error } = await supabase
      .from("categories")
      .select(`
        id,
        name,
        slug,
        description,
        parent_id,
        image,
        is_active,
        created_at,
        updated_at,
        parent_category:parent_id (id, name, slug)
      `)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return { success: true, data };
  } catch (err) {
    console.error("getCategories failed:", err);
    return { success: false, error: err };
  }
}