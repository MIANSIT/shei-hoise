// lib/hook/profile-user/useCustomerFormData.ts
import { DetailedCustomer } from "@/lib/types/users";

interface FormUserData {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  profile: {
    date_of_birth: string | null;
    gender: string | null;
    address_line_1: string | null;
    address_line_2: string | null;
    city: string | null;
    state: string | null;
    postal_code: string | null;
    country: string | null;
  } | null;
}

export function useCustomerFormData(
  customer: DetailedCustomer | null
): FormUserData | null {
  if (!customer) return null;

  // Use first_name/last_name from DetailedCustomer if available, otherwise extract from name
  const firstName = customer.first_name || customer.name?.split(" ")[0] || "";
  const lastName =
    customer.last_name || customer.name?.split(" ").slice(1).join(" ") || "";

  // Convert undefined to null for EditProfileForm compatibility
  const phoneValue = customer.phone !== undefined ? customer.phone : null;

  return {
    id: customer.id,
    email: customer.email,
    first_name: firstName || null,
    last_name: lastName || null,
    phone: phoneValue,
    profile: customer.profile_details
      ? {
          date_of_birth: customer.profile_details.date_of_birth || null,
          gender: customer.profile_details.gender || null,
          address_line_1: customer.profile_details.address_line_1 || null,
          address_line_2: customer.profile_details.address_line_2 || null,
          city: customer.profile_details.city || null,
          state: customer.profile_details.state || null,
          postal_code: customer.profile_details.postal_code || null,
          country: customer.profile_details.country || null,
        }
      : null,
  };
}
