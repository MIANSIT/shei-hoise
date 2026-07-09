import { supabase } from "@/lib/supabase";
import type { DeliveryCourier } from "@/lib/types/store/store";

// Fallback only for the rare case a store has no store_settings row at all
// yet (so the column's own DEFAULT never applied) — every real row already
// carries these via the DB default / migration backfill. Keeping this here
// means the UI never has to hardcode "Pathao"/"Steadfast" itself.
const BUILT_IN_FALLBACK: DeliveryCourier[] = [
  { id: "pathao", name: "Pathao", type: "pathao", deletable: false, created_at: "" },
  { id: "steadfast", name: "Steadfast", type: "steadfast", deletable: false, created_at: "" },
];

/** Every courier a store can ship through — Pathao, Steadfast, and any custom ones — all sourced from store_settings.delivery_couriers. */
export async function getDeliveryCouriers(storeId: string): Promise<DeliveryCourier[]> {
  const { data, error } = await supabase
    .from("store_settings")
    .select("delivery_couriers")
    .eq("store_id", storeId)
    .maybeSingle();

  if (error || !data || !data.delivery_couriers) return BUILT_IN_FALLBACK;

  const list = data.delivery_couriers as DeliveryCourier[];
  return list.length > 0 ? list : BUILT_IN_FALLBACK;
}
