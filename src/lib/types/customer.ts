// lib/types/customer.ts
import { ReactNode } from "react";

export interface CustomerProfile {
  id?: string;
  store_customer_id?: string;
  avatar_url?: string | null;
  date_of_birth?: string | null;
  gender?: 'male' | 'female' | 'other' | null;
  address?: string | null; // ✅ CHANGED: address_line_1 → address
  address_line_1?: string | null; // ✅ KEPT: For backward compatibility
  address_line_2?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  country?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Customer {
  id: string;
  email: string;
  first_name: string | null;
  phone?: string;
  store_id: string;
  user_type: "customer";
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CreateCustomerResponse {
  city: ReactNode;
  id: string;
  email: string;
  first_name: string;
  phone?: string;
  store_id: string;
  user_type: "customer";
  is_active: boolean;
  created_at: string;
}

export interface StoreCustomer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  auth_user_id?: string | null;
  profile_id?: string | null;
  created_at?: string;
  updated_at?: string;
  customer_profiles?: CustomerProfile;
}