"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";

export interface StockMovement {
  id: string;
  delta: number;
  previousQuantity: number;
  newQuantity: number;
  reason: string;
  note: string | null;
  createdAt: string;
  createdByName: string | null;
}

interface DatabaseMovement {
  id: string;
  delta: number;
  previous_quantity: number;
  new_quantity: number;
  reason: string;
  note: string | null;
  created_at: string;
  users: { first_name: string; last_name: string } | null;
}

/** Last N stock_movements rows for a product/variant, newest first — the audit trail behind the history icon on the Stock page. */
export async function getStockMovements(
  productId: string,
  variantId: string | null = null,
  limit: number = 5,
): Promise<StockMovement[]> {
  let query = supabaseAdmin
    .from("stock_movements")
    .select(
      "id, delta, previous_quantity, new_quantity, reason, note, created_at, users(first_name, last_name)",
    )
    .eq("product_id", productId)
    .order("created_at", { ascending: false })
    .limit(limit);

  query = variantId ? query.eq("variant_id", variantId) : query.is("variant_id", null);

  const { data, error } = await query;
  if (error) {
    console.error("Failed to fetch stock movements:", error);
    return [];
  }

  const rows = (data ?? []) as unknown as DatabaseMovement[];
  return rows.map((r) => ({
    id: r.id,
    delta: r.delta,
    previousQuantity: r.previous_quantity,
    newQuantity: r.new_quantity,
    reason: r.reason,
    note: r.note,
    createdAt: r.created_at,
    createdByName: r.users ? `${r.users.first_name} ${r.users.last_name}`.trim() : null,
  }));
}
