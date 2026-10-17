"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireOwner } from "@/lib/permissions/server";
import type { CheckoutLead, CheckoutLeadItem } from "@/lib/types/checkoutLead";

const MAX_ROWS = 200;

interface CheckoutLeadRow {
  id: string;
  phone: string;
  customer_name: string | null;
  city: string | null;
  items: CheckoutLeadItem[] | null;
  num_items: number;
  cart_value: number | string;
  currency: string | null;
  updated_at: string;
}

/**
 * Shoppers who entered a phone number at checkout in the last `days` days and
 * haven't ordered, newest first. Owner-only: the rows hold customer phone
 * numbers, and the table is service-role access only.
 *
 * Returns an empty list (not an error) if the table is missing, so the page
 * still loads before migration 20261025000000 has been applied.
 */
export async function getCheckoutLeads(storeId: string, days: number): Promise<CheckoutLead[]> {
  const auth = await requireOwner({ storeId });
  if (!auth.ok) return [];

  const since = new Date(Date.now() - days * 86_400_000).toISOString();

  const { data, error } = await supabaseAdmin
    .from("checkout_leads")
    .select("id, phone, customer_name, city, items, num_items, cart_value, currency, updated_at")
    .eq("store_id", storeId)
    .is("converted_at", null)
    .gte("updated_at", since)
    .order("updated_at", { ascending: false })
    .limit(MAX_ROWS);

  if (error || !data) return [];

  return (data as CheckoutLeadRow[]).map((row) => ({
    id: row.id,
    phone: row.phone,
    customerName: row.customer_name,
    city: row.city,
    items: Array.isArray(row.items) ? row.items : [],
    numItems: row.num_items,
    cartValue: Number(row.cart_value) || 0,
    currency: row.currency,
    updatedAt: row.updated_at,
  }));
}
