"use server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export interface GetOrCreateCustomerResult {
  customerId: string | null;
  error?: string;
}

// Resolves a walk-in customer for a Quick Sale "due" order — needs a real
// store_customers row (not just free-text name/phone) so a due balance can
// be found and collected again later. store_customers has no store_id
// column (customers are shared across stores on this platform, linked via
// store_customer_links, unique on (customer_id, store_id) — schema.sql:866)
// so an existing customer just gets (re)linked to this store rather than
// duplicated. Looked up by phone rather than email since that's what a
// cashier actually has for a walk-in — same digit-only normalization as
// getCustomerByPhone.ts, reused here instead of that function directly
// since this also needs to *create* the customer when no match exists.
export async function getOrCreateCustomerByPhone(
  storeId: string,
  name: string,
  phone: string,
): Promise<GetOrCreateCustomerResult> {
  const cleanedPhone = phone.replace(/\D/g, "");
  if (!cleanedPhone) {
    return { customerId: null, error: "Phone number is required" };
  }

  // .limit(1) instead of .maybeSingle() — phone has no unique constraint on
  // store_customers, so more than one existing row can already share a
  // number (e.g. reused/test data); .maybeSingle() throws "JSON object
  // requested, multiple (or no) rows returned" the moment that happens,
  // which was blocking every due sale for any phone number with a
  // pre-existing duplicate. Any one match is fine here — this is best-effort
  // walk-in customer resolution, not a strict identity lookup.
  const { data: existingRows, error: lookupError } = await supabaseAdmin
    .from("store_customers")
    .select("id")
    .eq("phone", cleanedPhone)
    .limit(1);

  if (lookupError) {
    return { customerId: null, error: lookupError.message };
  }

  let customerId = existingRows?.[0]?.id as string | undefined;

  if (!customerId) {
    const { data: created, error: createError } = await supabaseAdmin
      .from("store_customers")
      .insert({ name: name.trim() || null, phone: cleanedPhone })
      .select("id")
      .single();

    if (createError || !created) {
      return {
        customerId: null,
        error: createError?.message || "Failed to create customer",
      };
    }
    customerId = created.id;
  }

  const { error: linkError } = await supabaseAdmin
    .from("store_customer_links")
    .upsert(
      { store_id: storeId, customer_id: customerId },
      { onConflict: "customer_id,store_id", ignoreDuplicates: true },
    );

  if (linkError) {
    return { customerId: null, error: linkError.message };
  }

  return { customerId: customerId ?? null };
}
