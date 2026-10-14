"use server";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabaseAdmin } from "@/lib/supabase/admin";
import { staffPermissionError } from "@/lib/permissions/server";
import { normalizePhone } from "@/lib/utils/normalizePhone";

export interface CreateCustomerData {
  store_id: string;
  email?: string; // Made optional
  first_name: string;
  phone?: string;
  address_line_1?: string;
  city?: string;
  country?: string;
  postal_code?: string;
  auth_user_id?: string;
}

export async function createCustomer(customerData: CreateCustomerData) {
  try {
    // Also used by storefront checkout and sign-up, so only staff are checked.
    const denied = await staffPermissionError([
      "customers.add",
      "orders.add",
      "orders.edit",
      "pos.add",
    ]);
    if (denied) throw new Error(denied);

    // Check if a customer with this email already exists (only if email is provided)
    if (customerData.email) {
      const { data: existingCustomer, error: checkError } = await supabaseAdmin
        .from("store_customers")
        .select("*")
        .eq("email", customerData.email)
        .single();

      // PGRST116 = no rows found
      if (checkError && checkError.code !== "PGRST116") {
        console.error("Error checking existing customer:", checkError);
        throw new Error("Failed to verify existing customer");
      }

      if (existingCustomer) {
        throw new Error(
          `A customer with email ${customerData.email} already exists`,
        );
      }
    }

    // Phone is unique across customers, stored as 01XXXXXXXXX whatever shape
    // it was typed in.
    const phone = normalizePhone(customerData.phone);
    if (phone) {
      const { data: samePhone, error: phoneCheckError } = await supabaseAdmin
        .from("store_customers")
        .select("id")
        .eq("phone", phone)
        .limit(1);

      if (phoneCheckError) {
        console.error("Error checking existing phone:", phoneCheckError);
        throw new Error("Failed to verify existing customer");
      }
      if (samePhone && samePhone.length > 0) {
        throw new Error(`A customer with phone ${phone} already exists`);
      }
    }

    // Insert customer
    const customerInsertData = {
      name: customerData.first_name,
      email: customerData.email || null, // Allow null email
      phone,
      auth_user_id: customerData.auth_user_id || null,
    };

    const { data: customerDataResult, error: customerError } =
      await supabaseAdmin
        .from("store_customers")
        .insert([customerInsertData])
        .select()
        .single();

    if (customerError) {
      console.error("Error creating customer:", customerError);
      // 23505 = a concurrent request created this phone a moment ago.
      if (customerError.code === "23505" && phone) {
        throw new Error(`A customer with phone ${phone} already exists`);
      }
      throw new Error(customerError.message);
    }

    // Optional: create customer profile if address info is provided
    let profileData = null;
    if (
      customerData.address_line_1 ||
      customerData.city ||
      customerData.postal_code
    ) {
      try {
        const { data: profileResult, error: profileError } = await supabaseAdmin
          .from("customer_profiles")
          .insert({
            store_customer_id: customerDataResult.id,
            address: customerData.address_line_1,
            city: customerData.city,
            postal_code: customerData.postal_code,
            country: customerData.country || "Bangladesh",
          })
          .select()
          .single();

        if (profileError) {
          console.error("Customer profile creation error:", profileError);
        } else {
          profileData = profileResult;

          // Update store_customer with profile_id
          const { error: updateError } = await supabaseAdmin
            .from("store_customers")
            .update({ profile_id: profileResult.id })
            .eq("id", customerDataResult.id);

          if (updateError) {
            console.error(
              "Error updating store_customer with profile_id:",
              updateError,
            );
          }
        }
      } catch (profileError: any) {
        console.error(
          "Unexpected error during profile creation:",
          profileError,
        );
      }
    }

    // Link customer to store
    try {
      const { error: linkError } = await supabaseAdmin
        .from("store_customer_links")
        .insert({
          store_id: customerData.store_id,
          customer_id: customerDataResult.id,
        });

      if (linkError) {
        console.error("Store customer link creation error:", linkError);
      }
    } catch (linkError: any) {
      console.error("Unexpected error during store linking:", linkError);
    }

    return {
      id: customerDataResult.id,
      name: customerDataResult.name,
      email: customerDataResult.email,
      phone: customerDataResult.phone,
      profile_id: profileData?.id || null,
      profile: profileData,
    };
  } catch (error) {
    console.error("Customer creation failed:", error);
    throw error;
  }
}
