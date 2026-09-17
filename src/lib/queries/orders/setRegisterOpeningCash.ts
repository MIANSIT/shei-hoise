"use server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getAuthenticatedStoreId } from "@/lib/utils/getAuthenticatedStoreId";

/**
 * Sets (or corrects, same day) the drawer's opening cash for a date — one
 * row per store per date, so re-saving the same date just updates it rather
 * than creating a duplicate.
 */
export async function setRegisterOpeningCash(
  dateStr: string,
  amount: number,
): Promise<void> {
  const storeResult = await getAuthenticatedStoreId();
  if (!storeResult.ok) throw new Error(storeResult.error);

  const { error } = await supabaseAdmin.from("store_register_openings").upsert(
    {
      store_id: storeResult.storeId,
      register_date: dateStr,
      opening_amount: amount,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "store_id,register_date" },
  );

  if (error) throw new Error(error.message);
}
