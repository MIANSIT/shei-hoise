// lib/types/customer.ts

import { ReactNode } from "react";
export interface CustomerProfile {
  user_id: string;
  address_line_1?: string | null;
  address_line_2?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  country?: string | null;
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
