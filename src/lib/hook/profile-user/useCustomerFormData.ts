// lib/hook/profile-user/useCustomerFormData.ts
import { DetailedCustomer } from "@/lib/types/users";

// Define the profile type
interface CustomerProfile {
  id: string;
  store_customer_id: string;
  avatar_url: string | null;
  date_of_birth: string | null;
  gender: string | null;
  address: string | null; // Make sure this is 'address' not 'address_line_1'
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
  created_at: string;
  updated_at: string;
}

interface FormUserData {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  profile: CustomerProfile | null;
}

export function useCustomerFormData(
  customer: DetailedCustomer | null
): FormUserData | null {
  if (!customer) return null;

  

  // Create profile object - handle both address_line_1 and address
  let profile: CustomerProfile | null = null;

  if (customer.profile_details) {
    // Try to get address from both possible field names
    const address =
      customer.profile_details.address || // Direct address field
      customer.profile_details.address_line_1 || // Mapped address field
      null;


    profile = {
      id: customer.profile_id || "",
      store_customer_id: customer.id,
      avatar_url: null,
      date_of_birth: customer.profile_details.date_of_birth || null,
      gender: customer.profile_details.gender || null,
      address: address, // Use the extracted address
      city: customer.profile_details.city || null,
      state: customer.profile_details.state || null,
      postal_code: customer.profile_details.postal_code || null,
      country: customer.profile_details.country || null,
      created_at: customer.created_at || "",
      updated_at: customer.updated_at || "",
    };
  }


  return {
    id: customer.id,
    email: customer.email,
    name: customer.name || null,
    phone: customer.phone || null,
    profile: profile,
  };
}
