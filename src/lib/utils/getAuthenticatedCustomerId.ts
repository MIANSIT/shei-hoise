import { createClient } from "@/lib/supabase/server";

export type AuthenticatedCustomerResult =
  | { ok: true; customerId: string }
  | { ok: false; error: string };

/**
 * Resolves the calling customer's own store_customers.id from their session
 * cookie — never from a client-supplied argument. Mirrors getAuthenticatedStoreId
 * but for the customer-facing self-service flows (e.g. /[store_slug]/my-profile),
 * where the caller is a customer rather than a store owner.
 */
export async function getAuthenticatedCustomerId(): Promise<AuthenticatedCustomerResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, error: "Unauthorized" };

  const { data: customer } = await supabase
    .from("store_customers")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!customer?.id) {
    return { ok: false, error: "No customer account associated with this session" };
  }

  return { ok: true, customerId: customer.id };
}
