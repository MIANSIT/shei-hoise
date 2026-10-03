import { supabase } from "@/lib/supabase";

/** The cash float recorded for a store on a given date, or null if none has been set yet. */
export async function getRegisterOpeningCash(
  storeId: string,
  dateStr: string,
  /** Stores with branches: that branch's drawer. */
  branchId?: string | null,
): Promise<number | null> {
  if (!storeId) return null;

  let query = supabase
    .from("store_register_openings")
    .select("opening_amount")
    .eq("store_id", storeId)
    .eq("register_date", dateStr);
  if (branchId) query = query.eq("branch_id", branchId);
  const { data, error } = await query.maybeSingle();

  if (error) {
    console.error("Failed to load register opening cash:", error.message);
    return null;
  }

  return data ? Number(data.opening_amount) : null;
}
