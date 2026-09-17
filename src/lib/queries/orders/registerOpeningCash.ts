import { supabase } from "@/lib/supabase";

/** The cash float recorded for a store on a given date, or null if none has been set yet. */
export async function getRegisterOpeningCash(
  storeId: string,
  dateStr: string,
): Promise<number | null> {
  if (!storeId) return null;

  const { data, error } = await supabase
    .from("store_register_openings")
    .select("opening_amount")
    .eq("store_id", storeId)
    .eq("register_date", dateStr)
    .maybeSingle();

  if (error) {
    console.error("Failed to load register opening cash:", error.message);
    return null;
  }

  return data ? Number(data.opening_amount) : null;
}
