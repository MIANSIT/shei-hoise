import { supabaseAdmin } from "@/lib/supabase/admin";

/*
 * Each supplier's own credit period ("pays within N days", set on the Suppliers page).
 * Server-only helpers used by the supplier queries; not a "use server" file, so the browser
 * cannot call them. The read returns nothing when the column is missing, so bills behave
 * as before.
 */

/** Every supplier's own pays-within days (supplier id to days); suppliers with none are absent. */
export async function loadSupplierTermsDays(storeId: string): Promise<Map<string, number>> {
  const terms = new Map<string, number>();
  try {
    const { data, error } = await supabaseAdmin.from("suppliers").select("id, payment_terms_days").eq("store_id", storeId);
    if (error) return terms;
    for (const row of (data ?? []) as { id: string; payment_terms_days: number | null }[]) {
      if (typeof row.payment_terms_days === "number" && row.payment_terms_days > 0) terms.set(row.id, row.payment_terms_days);
    }
  } catch {
    // Column not there yet: no terms.
  }
  return terms;
}

/** A YYYY-MM-DD date plus a number of days. */
export function addDaysIso(isoDate: string, days: number): string {
  const date = new Date(`${isoDate.slice(0, 10)}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
