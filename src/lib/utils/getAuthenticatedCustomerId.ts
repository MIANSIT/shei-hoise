import { createClient } from "@/lib/supabase/server";

export type AuthenticatedCustomerResult =
  | { ok: true; customerId: string }
  | { ok: false; error: string };

/**
 * Resolves the calling customer's own store_customers.id from their session
 * cookie — never from a client-supplied argument. Mirrors getAuthenticatedStoreId
 * but for the customer-facing self-service flows (e.g. /[store_slug]/my-profile),
 * where the caller is a customer rather than a store owner.
 *
 * Self-healing: signup runs as several non-atomic steps (create auth user,
 * auto-login, create store_customers row, link to store) — a dropped
 * connection or crash between steps can leave a real, confirmed auth
 * account with no store_customers row (this happened for a batch of
 * migrated accounts; see 20260828000002_backfill_missing_customer_profiles.sql).
 * Rather than erroring for an authenticated customer with no profile, this
 * creates one on the spot, so the gap can't strand a real session again.
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

  if (customer?.id) return { ok: true, customerId: customer.id };

  if (!user.email) {
    return { ok: false, error: "No customer account associated with this session" };
  }

  // Match on email too — a customer signed up under this email before
  // getting an auth_user_id linked (e.g. a guest checkout later creates an
  // account) shouldn't get a second, duplicate profile.
  const { data: byEmail } = await supabase
    .from("store_customers")
    .select("id, auth_user_id")
    .ilike("email", user.email)
    .maybeSingle();

  if (byEmail?.id) {
    if (!byEmail.auth_user_id) {
      await supabase
        .from("store_customers")
        .update({ auth_user_id: user.id })
        .eq("id", byEmail.id);
    }
    return { ok: true, customerId: byEmail.id };
  }

  const { data: created, error: createError } = await supabase
    .from("store_customers")
    .insert({
      auth_user_id: user.id,
      email: user.email.toLowerCase(),
      name: (user.user_metadata?.name as string | undefined) || user.email.split("@")[0],
      phone: (user.user_metadata?.phone as string | undefined) || null,
    })
    .select("id")
    .single();

  if (createError || !created) {
    return { ok: false, error: "No customer account associated with this session" };
  }

  return { ok: true, customerId: created.id };
}
