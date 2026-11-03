import { supabaseAdmin } from "@/lib/supabase/admin";
import type { FunderTreatment } from "./moneyPartnerTypes";

/**
 * Checks the "who paid" choice that comes from the browser before it is saved:
 * it only counts when the payment really came from outside the shop, and the
 * person must be on this store's list. Server code only: it is deliberately not
 * a server action, so the browser cannot call it.
 * @returns the values to save (all null when it does not apply), or why it was refused
 */
export async function resolveFunder(
  storeId: string,
  paidFrom: string | null | undefined,
  funderId: string | null | undefined,
  treatment: FunderTreatment | null | undefined,
): Promise<{ ok: true; funderId: string | null; treatment: FunderTreatment | null } | { ok: false; error: string }> {
  if (paidFrom !== "outside" || !funderId) return { ok: true, funderId: null, treatment: null };
  if (treatment !== "capital" && treatment !== "loan") return { ok: false, error: "Choose how this money counts" };
  const { data } = await supabaseAdmin
    .from("money_partners")
    .select("id")
    .eq("id", funderId)
    .eq("store_id", storeId)
    .maybeSingle();
  if (!data) return { ok: false, error: "That person is not on the list" };
  return { ok: true, funderId: data.id, treatment };
}
