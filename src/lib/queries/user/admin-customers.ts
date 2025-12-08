import { supabase } from "@/lib/supabase";

// Interface matching your database
interface UpdateCustomerData {
  name: string;
  phone: string;
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
    // Process customer data for store_customers table
    const processedCustomerData = {
      name: customerData.name.trim(),
      phone: customerData.phone.trim() || null,
      updated_at: new Date().toISOString(),
    };

    // Validate required field
    if (!processedCustomerData.name) {
      throw new Error("Customer name is required");
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
