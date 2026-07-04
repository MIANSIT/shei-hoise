"use server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function createSignupCustomer(email: string, authUserId?: string, phone?: string) {
  const { data: customer, error } = await supabaseAdmin
    .from("store_customers")
    .insert({
      email: email.toLowerCase(),
      auth_user_id: authUserId,
      name: email.split("@")[0],
      phone: phone || "",
    })
    .select("id")
    .single();

  if (error) {
    console.error("Failed to create customer:", error?.message, error?.code, error?.details);
    // If customer already exists, try to fetch existing one
    const { data: existingCustomer } = (await supabaseAdmin
      .rpc("find_customer_by_email", { p_email: email.toLowerCase() })
      .single()) as { data: { id: string } | null };

    return existingCustomer;
  }

  return customer;
}

export async function linkSignupCustomerToStore(customerId: string, storeId: string) {
  const { error } = await supabaseAdmin
    .from("store_customer_links")
    .insert({ customer_id: customerId, store_id: storeId });

  if (error) {
    console.error("Failed to create store-customer link:", error);
    // Link might already exist, which is fine
  }
}
