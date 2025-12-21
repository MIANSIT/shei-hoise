// lib/queries/user/updateCustomerProfile.ts
import { supabase } from "@/lib/supabase";

interface UpdateCustomerData {
  name: string;
  phone: string;
}

interface UpdateCustomerProfileData {
  date_of_birth?: string;
  gender?: string;
  address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
}

export async function updateCustomerProfile(
  customerId: string,
  customerData: UpdateCustomerData,
  profileData: UpdateCustomerProfileData
) {
  try {
    // Validate input
    if (!customerData.name.trim()) {
      throw new Error("Name is required");
    }

    // Update store_customers table
    const { data: updatedCustomer, error: customerError } = await supabase
      .from("store_customers")
      .update({
        name: customerData.name.trim(),
        phone: customerData.phone?.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", customerId)
      .select()
      .single();

    if (customerError) {
      throw new Error(`Failed to update customer: ${customerError.message}`);
    }

    // Helper function to convert empty strings to null
    const emptyToNull = (value: string | undefined): string | null => {
      if (!value || value.trim() === "") return null;
      return value.trim();
    };

    // Helper function for date fields
    const processDateField = (value: string | undefined): string | null => {
      if (!value || value.trim() === "") return null;
      const date = new Date(value);
      return isNaN(date.getTime()) ? null : value.trim();
    };

    // Prepare profile data
    const processedProfileData = {
      date_of_birth: processDateField(profileData.date_of_birth),
      gender: emptyToNull(profileData.gender),
      address: emptyToNull(profileData.address),
      city: emptyToNull(profileData.city),
      state: emptyToNull(profileData.state),
      postal_code: emptyToNull(profileData.postal_code),
      country: emptyToNull(profileData.country),
      updated_at: new Date().toISOString(),
    };

    // Check if profile exists
    const { data: existingProfile } = await supabase
      .from("customer_profiles")
      .select("id")
      .eq("store_customer_id", customerId)
      .maybeSingle();

    let updatedProfile = null;

    if (existingProfile) {
      // Update existing profile
      const { data: profile, error: profileError } = await supabase
        .from("customer_profiles")
        .update(processedProfileData)
        .eq("id", existingProfile.id)
        .select()
        .single();

      if (profileError) {
        throw new Error(`Failed to update profile: ${profileError.message}`);
      }
      updatedProfile = profile;
    } else {
      // Create new profile
      const { data: profile, error: profileError } = await supabase
        .from("customer_profiles")
        .insert({
          store_customer_id: customerId,
          ...processedProfileData,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (profileError) {
        throw new Error(`Failed to create profile: ${profileError.message}`);
      }
      updatedProfile = profile;
    }

    return {
      data: updatedCustomer,
      profile: updatedProfile,
    };
  } catch (error) {
    console.error("Error in updateCustomerProfile:", error);
    throw error;
  }
}