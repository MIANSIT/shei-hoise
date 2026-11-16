import { supabase } from "@/lib/supabase";
import { PaymentMethod } from "@/lib/types/enums";

/**
 * The stored payment_split of every split-payment order among these orders, by order id. Only orders whose
 * payment_method is 'split' are looked up, so with none of them (or before the 20261214 migration, when none can
 * exist) no query is made and the payment_split column is never selected.
 * @returns order id → raw payment_split; an order left out (or a failed read) falls back to its single method
 */
export async function loadPaymentSplits(
  storeId: string,
  orders: readonly { id: string; payment_method: string | null }[],
): Promise<Map<string, unknown>> {
  const splits = new Map<string, unknown>();
  const ids = orders.filter((o) => o.payment_method === PaymentMethod.SPLIT).map((o) => o.id);
  const chunk = 200;
  for (let i = 0; i < ids.length; i += chunk) {
    const { data, error } = await supabase
      .from("orders")
      .select("id, payment_split")
      .eq("store_id", storeId)
      .in("id", ids.slice(i, i + chunk));
    if (error) {
      console.error("Failed to load split payments:", error.message);
      return splits;
    }
    for (const row of (data ?? []) as { id: string; payment_split: unknown }[]) splits.set(row.id, row.payment_split);
  }
  return splits;
}
