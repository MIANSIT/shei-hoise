export interface ProfileFormData {
  name: string; // From store_customers table or users table
  phone: string; // From store_customers table or users table
  email: string; // From store_customers table or users table
  date_of_birth: string; // From customer_profiles table or user_profiles table
  gender: string; // From customer_profiles table or user_profiles table
  address: string; // From customer_profiles table (field name is 'address')
  city: string; // From customer_profiles table or user_profiles table
  state: string; // From customer_profiles table or user_profiles table
  postal_code: string; // From customer_profiles table or user_profiles table
  country: string; // From customer_profiles table or user_profiles table
}

// Add this new type for common profile properties
export type CommonProfile = {
  id: string;
  date_of_birth: string | null;
  gender: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
  created_at: string;
  updated_at: string;
};
export interface UpdateUserData {
  first_name: string;
  last_name: string;
  phone: string;
}

export interface UpdateProfileData {
  avatar_url: string;
  date_of_birth: string;
  gender: string;
  address_line_1: string;
  address_line_2: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
}
