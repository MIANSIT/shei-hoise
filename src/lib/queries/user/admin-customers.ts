"use server";
import { supabaseAdmin as supabase } from "@/lib/supabase/admin";

// Interface matching your database
interface UpdateCustomerData {
  name: string;
  phone: string;
  email?: string;
}

interface UpdateProfileData {
  date_of_birth: string;
  gender: string;
  address: string; // Field name is 'address' in customer_profiles
  city: string;
  state: string;
  postal_code: string;
  country: string;
}

export async function updateCustomerProfileAsAdmin(
  customerId: string,
  customerData: UpdateCustomerData,
  profileData: UpdateProfileData
) {
  try {
    const email = customerData.email?.trim() || null;

    // Process customer data for store_customers table
    const processedCustomerData = {
      name: customerData.name.trim(),
      phone: customerData.phone.trim() || null,
      email,
      updated_at: new Date().toISOString(),
    };

    // Validate required field
    if (!processedCustomerData.name) {
      throw new Error("Customer name is required");
    }

    // Guard against linking this customer to an email another customer
    // already uses (mirrors the check in createCustomer.ts).
    if (email) {
      const { data: existingCustomer, error: checkError } = await supabase
        .from("store_customers")
        .select("id")
        .eq("email", email)
        .neq("id", customerId)
        .maybeSingle();

      if (checkError) {
        throw new Error("Failed to verify existing customer");
      }
      if (existingCustomer) {
        throw new Error(`A customer with email ${email} already exists`);
      }
    }

    // Update store_customers table
    const { data: customerUpdate, error: customerError } = await supabase
      .from("store_customers")
      .update(processedCustomerData)
      .eq("id", customerId)
      .select()
      .single();

    if (customerError) {
      throw new Error(`Failed to update customer: ${customerError.message}`);
    }

    // Process profile data for customer_profiles table
    const processedProfileData = {
      date_of_birth: profileData.date_of_birth || null,
      gender: profileData.gender || null,
      address: profileData.address || null,
      city: profileData.city || null,
      state: profileData.state || null,
      postal_code: profileData.postal_code || null,
      country: profileData.country || null,
      updated_at: new Date().toISOString(),
    };

    // Check if profile exists
    const { data: existingProfile } = await supabase
      .from("customer_profiles")
      .select("id")
      .eq("store_customer_id", customerId)
      .maybeSingle();

    let profileUpdate = null;

    if (existingProfile) {
      // Update existing profile
      const { data, error } = await supabase
        .from("customer_profiles")
        .update(processedProfileData)
        .eq("store_customer_id", customerId)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update profile: ${error.message}`);
      }
      profileUpdate = data;
    } else {
      // Create profile if it doesn't exist
      const { data, error } = await supabase
        .from("customer_profiles")
        .insert({
          store_customer_id: customerId,
          ...processedProfileData,
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create profile: ${error.message}`);
      }
      profileUpdate = data;
    }

    return {
      customer: customerUpdate,
      profile: profileUpdate,
    };
  } catch (error) {
    console.error("Error in updateCustomerProfileAsAdmin:", error);
    throw error;
  }
}
