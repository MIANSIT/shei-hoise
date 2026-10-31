import { supabaseAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { normalizePhone } from "@/lib/utils/normalizePhone";
import { membershipFeatureEnabled } from "./membershipFeature";

// Server-only. Decides WHO a storefront shopper is for member discounts. A
// phone number alone proves nothing (anyone can type a member's number), so a
// shopper counts as a member only when:
//   1. they are signed in, and their own customer record has a membership here, or
//   2. they type a membership number AND the phone number they give at
//      checkout is the one saved on that membership's customer.
// Membership numbers are sequential (PAW-126-001, -002 ...), so a number on its
// own is never enough.

// Membership numbers run in sequence (PAW-126-001, -002 ...), so with a known phone number a
// stranger could try them one after another. Wrong guesses are counted per phone number, and after a
// few the number-and-phone route is closed for that phone for a while. In memory, per server process:
// it slows a guesser down, it does not replace a shared limiter.
const MAX_WRONG_GUESSES = 6;
const GUESS_WINDOW_MS = 15 * 60 * 1000;
const wrongGuesses = new Map<string, { count: number; windowStart: number }>();

function guessesLeft(phone: string, now: number): boolean {
  const entry = wrongGuesses.get(phone);
  if (!entry || now - entry.windowStart > GUESS_WINDOW_MS) return true;
  return entry.count < MAX_WRONG_GUESSES;
}

function noteWrongGuess(phone: string, now: number): void {
  const entry = wrongGuesses.get(phone);
  if (!entry || now - entry.windowStart > GUESS_WINDOW_MS) wrongGuesses.set(phone, { count: 1, windowStart: now });
  else entry.count += 1;
  // Keep the map from growing without end.
  if (wrongGuesses.size > 5000) {
    for (const [key, value] of wrongGuesses) if (now - value.windowStart > GUESS_WINDOW_MS) wrongGuesses.delete(key);
  }
}

/**
 * The customer whose membership applies to this shopper, or null when none can be verified.
 * @param storeId - The store being shopped at
 * @param options.membershipNumber - A number the shopper typed, if any
 * @param options.phone - The phone number the shopper gives at checkout
 */
export async function resolveStorefrontMemberId(
  storeId: string,
  options: { membershipNumber?: string | null; phone?: string | null },
): Promise<string | null> {
  // A store whose plan has no memberships has no members to find: skip the lookups entirely.
  if (!(await membershipFeatureEnabled(storeId))) return null;

  // 1. Signed in: the session, not anything the browser sends, says who this is.
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data: owned } = await supabaseAdmin.from("store_customers").select("id").eq("auth_user_id", user.id).limit(20);
      const ids = (owned ?? []).map((c: { id: string }) => c.id);
      if (ids.length > 0) {
        const { data: held } = await supabaseAdmin
          .from("customer_memberships")
          .select("customer_id")
          .eq("store_id", storeId)
          .in("customer_id", ids)
          .limit(1)
          .maybeSingle();
        if (held) return (held as { customer_id: string }).customer_id;
      }
    }
  } catch (error) {
    console.error("resolveStorefrontMemberId (session) failed:", error);
  }

  // 2. Not signed in (or no membership on their account): number plus matching phone.
  const number = options.membershipNumber?.trim();
  const phone = normalizePhone(options.phone);
  if (!number || !phone) return null;
  const now = Date.now();
  if (!guessesLeft(phone, now)) return null;

  // ilike treats % and _ as wildcards; the number must match exactly (ignoring case).
  const exact = number.replace(/[\\%_]/g, (c) => `\\${c}`);
  const { data } = await supabaseAdmin
    .from("customer_memberships")
    .select("customer_id, store_customers(phone)")
    .eq("store_id", storeId)
    .ilike("membership_number", exact)
    .limit(1)
    .maybeSingle();
  const row = data as unknown as { customer_id: string; store_customers: { phone: string | null } | null } | null;
  if (row && normalizePhone(row.store_customers?.phone) === phone) return row.customer_id;
  noteWrongGuess(phone, now);
  return null;
}
