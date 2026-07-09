"use server";
import { supabaseAdmin as supabase } from "@/lib/supabase/admin";

export async function deleteExpense(id: string, storeId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from("expenses")
      .delete()
      .eq("id", id)
      .eq("store_id", storeId)
      .select("id");

    if (error) {
      console.error("Error deleting expense:", error.message);
      return false;
    }

    // A DELETE matching zero rows (wrong id, or an id from a different
    // store) returns no error — without checking what actually got deleted,
    // this would silently report success while nothing happened.
    if (!data || data.length === 0) {
      console.error(`Delete matched no expense: id=${id} storeId=${storeId}`);
      return false;
    }

    return true;
  } catch (err) {
    console.error("Exception in deleteExpense:", err);
    return false;
  }
}
