import { createClient } from "@/lib/supabase/server";
import { getActor } from "@/lib/permissions/server";

export type AuthenticatedStoreResult =
  | { ok: true; storeId: string }
  | { ok: false; error: string };

/**
 * Resolves the calling user's own store_id from their session cookie —
 * never from a client-supplied argument. store_courier_credentials and
 * courier_tracking are service-role-only tables with no RLS policies of
 * their own, so every action that scopes a query by store_id must derive
 * it from here rather than trust an id passed in from the client.
 *
 * Staff carry users.store_id too, so a deactivated staff member, or one
 * whose store's plan no longer has staff_accounts, is refused here — that
 * covers every existing action built on this helper. What a staff member
 * may *do* is checked separately with requirePermission().
 */
export async function getAuthenticatedStoreId(): Promise<AuthenticatedStoreResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, error: "Unauthorized" };

  const { data: dbUser } = await supabase
    .from("users")
    .select("store_id, user_type")
    .eq("id", user.id)
    .maybeSingle();

  if (!dbUser?.store_id) {
    return { ok: false, error: "No store associated with this account" };
  }

  if (dbUser.user_type === "store_staff") {
    const actor = await getActor();
    if (!actor.ok) return { ok: false, error: actor.error };
  }

  return { ok: true, storeId: dbUser.store_id };
}
