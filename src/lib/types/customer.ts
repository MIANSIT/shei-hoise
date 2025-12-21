// lib/types/customer.ts

export type Gender = "male" | "female" | "other" | "prefer_not_to_say" | null;

// ----------------------
// Customer profile table
// ----------------------
export interface CustomerProfile {
  id: string;
  store_customer_id: string;
  avatar_url?: string | null;
  date_of_birth?: string | null;
  gender?: Gender;
  address?: string | null; // main address field
  address_line_1?: string | null; // optional for backward compatibility
  address_line_2?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  country?: string | null;
  created_at?: string;
  updated_at?: string;
}

// ----------------------
// Store customer table
// ----------------------
export interface StoreCustomer {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  auth_user_id?: string | null; // if you have auth linkage
  profile_id?: string | null; // link to customer_profiles.id
  created_at?: string;
  updated_at?: string;
}

// ----------------------
// Combined type for frontend usage
// ----------------------
export interface CustomerWithProfile extends StoreCustomer {
  profile?: CustomerProfile | null;
  store_slug?: string | null;
  store_name?: string | null;
}

// ----------------------
// Response for create customer API
// ----------------------
export interface CreateCustomerResponse extends StoreCustomer {
  profile?: CustomerProfile | null;
  store_slug?: string | null;
  store_name?: string | null;
}
