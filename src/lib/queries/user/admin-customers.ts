import { supabase } from "@/lib/supabase";

interface UpdateUserData {
  first_name: string;
  last_name: string;
  phone: string;
}

interface UpdateProfileData {
  date_of_birth: string;
  gender: string;
  address_line_1: string;
  address_line_2: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
}

// Helper function to convert empty strings to null
function emptyToNull(value: string): string | null {
  if (!value || value.trim() === "") return null;
  return value;
}

// Helper function specifically for date fields with validation
function processDateField(value: string): string | null {
  if (!value || value.trim() === "") return null;

  const date = new Date(value);
  if (isNaN(date.getTime())) {
    console.warn(`Invalid date format: ${value}`);
    return null;
  }

  return value;
}

export async function updateCustomerProfileAsAdmin(
  customerId: string,
  userData: UpdateUserData,
  profileData: UpdateProfileData
) {
  try {
    // Process user data
    const processedUserData = {
      first_name: userData.first_name.trim(),
      last_name: userData.last_name.trim(),
      phone: emptyToNull(userData.phone),
      updated_at: new Date().toISOString(),
    };

    // Validate required fields
    if (!processedUserData.first_name || !processedUserData.last_name) {
      throw new Error("First name and last name are required");
    }

    const { data: userUpdate, error: userError } = await supabase
      .from("users")
      .update(processedUserData)
      .eq("id", customerId)
      .select()
      .single();

    if (userError) {
      throw new Error(`Failed to update user: ${userError.message}`);
    }

    // Process profile data
    const processedProfileData = {
      date_of_birth: processDateField(profileData.date_of_birth),
      gender: emptyToNull(profileData.gender),
      address_line_1: emptyToNull(profileData.address_line_1),
      address_line_2: emptyToNull(profileData.address_line_2),
      city: emptyToNull(profileData.city),
      state: emptyToNull(profileData.state),
      postal_code: emptyToNull(profileData.postal_code),
      country: emptyToNull(profileData.country),
      updated_at: new Date().toISOString(),
    };

    // Check if profile exists - for store_owner, we can create if it doesn't exist
    const { data: existingProfile } = await supabase
      .from("user_profiles")
      .select("id")
      .eq("user_id", customerId)
      .maybeSingle();

    let profileUpdate = null;

    if (existingProfile) {
      // Update existing profile
      const { data, error } = await supabase
        .from("user_profiles")
        .update(processedProfileData)
        .eq("user_id", customerId)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update profile: ${error.message}`);
      }
      profileUpdate = data;
    } else {
      // For store_owner: create profile if it doesn't exist
      const { data, error } = await supabase
        .from("user_profiles")
        .insert({
          user_id: customerId,
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
      user: userUpdate,
      profile: profileUpdate,
    };
  } catch (error) {
    console.error("Error in updateCustomerProfileAsAdmin:", error);
    throw error;
  }
}
