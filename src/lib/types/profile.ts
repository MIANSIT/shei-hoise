export interface ProfileFormData {
  name: string; // From store_customers table
  phone: string; // From store_customers table
  email: string; // From store_customers table
  date_of_birth: string; // From customer_profiles table
  gender: string; // From customer_profiles table
  address: string; // From customer_profiles table (field name is 'address')
  city: string; // From customer_profiles table
  state: string; // From customer_profiles table
  postal_code: string; // From customer_profiles table
  country: string; // From customer_profiles table
}
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
