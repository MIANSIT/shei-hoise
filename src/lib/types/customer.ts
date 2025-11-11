import { ReactNode } from "react";

// lib/types/customer.ts
export interface Customer {
  id: string;
  email: string;
  first_name: string;
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
