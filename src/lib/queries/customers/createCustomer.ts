/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabaseAdmin } from "../../../lib/supabase";

export interface CreateCustomerData {
  store_id: string;
  email: string;
  first_name: string;
  phone?: string;
  address_line_1?: string;
  city?: string;
  country?: string;
  postal_code?: string;
}

export async function createCustomer(customerData: CreateCustomerData) {
  try {

    // Check if a customer with this email already exists
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
        `A customer with email ${customerData.email} already exists`
      );
    }

    // Insert customer
    const customerInsertData = {
      name: customerData.first_name,
      email: customerData.email,
      phone: customerData.phone || null,
    };

    const { data: customerDataResult, error: customerError } =
      await supabaseAdmin
        .from("store_customers")
        .insert([customerInsertData])
        .select()
        .single();

    if (customerError) {
      console.error("Error creating customer:", customerError);
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
              updateError
            );
          } else {
          }
        }
      } catch (profileError: any) {
        console.error(
          "Unexpected error during profile creation:",
          profileError
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
      } else {
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
