"use server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export interface CheckoutProfileValues {
  shippingAddress: string;
  city: string;
  postCode?: string;
  country: string;
}

/** Updates an existing customer_profiles row — used when a returning checkout customer already has a profile. */
export async function updateCheckoutCustomerProfile(
  profileId: string,
  values: CheckoutProfileValues,
): Promise<void> {
  const { error } = await supabaseAdmin
    .from("customer_profiles")
    .update({
      address: values.shippingAddress,
      city: values.city,
      postal_code: values.postCode || "",
      country: values.country,
      updated_at: new Date().toISOString(),
    })
    .eq("id", profileId);

  if (error) throw new Error(`Failed to update customer profile: ${error.message}`);
}

/** Creates a customer_profiles row for an existing store_customers row that has none yet, and links it back. */
export async function createCheckoutCustomerProfile(
  storeCustomerId: string,
  storeId: string,
  values: CheckoutProfileValues,
): Promise<void> {
  const { data: profile, error } = await supabaseAdmin
    .from("customer_profiles")
    .insert({
      store_customer_id: storeCustomerId,
      address: values.shippingAddress,
      city: values.city,
      postal_code: values.postCode || "",
      country: values.country,
    })
    .select("id")
    .single();

  if (error) throw new Error(`Failed to create customer profile: ${error.message}`);

  await supabaseAdmin
    .from("store_customers")
    .update({ profile_id: profile.id })
    .eq("id", storeCustomerId);

  await supabaseAdmin
    .from("store_customer_links")
    .upsert({ customer_id: storeCustomerId, store_id: storeId }, { onConflict: "customer_id,store_id" });
}
