"use server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { authorizeForStoreAny } from "@/lib/permissions/server";
import { normalizePhone } from "@/lib/utils/normalizePhone";

export interface CustomerNameLookup {
  found: boolean;
  id: string | null;
  name: string | null;
}

/**
 * Looks up a phone number so Quick Sale can fill in the saved name. Customers
 * are shared across a business's stores, so the phone is matched platform-wide;
 * only the customer's id and name are returned.
 * @param storeId - The caller's store, used to check their permission
 * @param phone - Phone as typed (any format)
 * @returns Whether a customer has this phone, and their saved name if any
 */
export async function lookupCustomerNameByPhone(
  storeId: string,
  phone: string,
): Promise<CustomerNameLookup> {
  const notFound: CustomerNameLookup = { found: false, id: null, name: null };

  const normalized = normalizePhone(phone);
  if (!normalized) return notFound;

  const auth = await authorizeForStoreAny(storeId, [
    "customers.add",
    "orders.add",
    "orders.edit",
    "pos.add",
  ]);
  if (!auth.ok) return notFound;

  const { data, error } = await supabaseAdmin
    .from("store_customers")
    .select("id, name")
    .eq("phone", normalized)
    .limit(1);

  if (error || !data || data.length === 0) return notFound;
  return {
    found: true,
    id: data[0].id as string,
    name: (data[0].name as string | null)?.trim() || null,
  };
}
