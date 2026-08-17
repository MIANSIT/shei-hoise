"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { fetchAllPaged } from "@/lib/queries/utils/fetchAllPaged";
import {
  HISTORY_LIMIT,
  type CustomerHistoryEntry,
} from "@/lib/types/orders/customerHistory";

/**
 * Recent order history per phone number, for the customers on one page of the
 * orders table.
 *
 * Keyed by phone rather than `customer_id` because phone is the more complete
 * identifier here — every order carries one, while a handful predate customer
 * records — and because it links the same person's guest and signed-in orders.
 * It is also what the COD risk scoring already keys on, so the two features
 * agree on who "the same customer" is.
 *
 * ALWAYS scoped to `storeId`. A shop owner seeing order history their customer
 * built up at a different shop would be a cross-tenant data leak, and the
 * orders table is per-store anyway.
 *
 * Fetches HISTORY_LIMIT + 1 per phone so the caller can drop the order being
 * viewed and still have a full set of prior ones.
 */
export async function getCustomerOrderHistory(
  storeId: string,
  phones: string[],
): Promise<Record<string, CustomerHistoryEntry[]>> {
  const unique = Array.from(
    new Set(phones.filter((p): p is string => typeof p === "string" && !!p)),
  );
  if (!storeId || unique.length === 0) return {};

  // PostgREST's in.() takes a comma-separated list, so a phone containing a
  // comma or parenthesis would break out of the filter. Real numbers never do,
  // but the values come from user-entered shipping addresses.
  const safe = unique
    .map((p) => p.replace(/[,()]/g, "").trim())
    .filter(Boolean);
  if (safe.length === 0) return {};

  const rows = await fetchAllPaged<{
    id: string;
    order_number: string;
    status: string;
    created_at: string;
    phone: string | null;
  }>((from, to) =>
    supabaseAdmin
      .from("orders")
      .select("id, order_number, status, created_at, shipping_address->>phone")
      .eq("store_id", storeId)
      .in("shipping_address->>phone", safe)
      .order("created_at", { ascending: false })
      .range(from, to),
  );

  // Already newest-first from the query, so the first N per phone are the most
  // recent. Capped as we go rather than after grouping — a customer with a long
  // history shouldn't cost memory we immediately discard.
  const byPhone: Record<string, CustomerHistoryEntry[]> = {};
  for (const row of rows) {
    const phone = row.phone;
    if (!phone) continue;

    const bucket = (byPhone[phone] ??= []);
    if (bucket.length >= HISTORY_LIMIT + 1) continue;

    bucket.push({
      orderId: row.id,
      orderNumber: row.order_number,
      status: row.status,
      createdAt: row.created_at,
    });
  }

  return byPhone;
}
