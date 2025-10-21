/* eslint-disable @typescript-eslint/no-explicit-any */
// lib/types/order.ts
export interface CustomerInfo {
  name: string;
  phone: string;
  address: string;
  deliveryMethod: string;
  city: string;
  email: string; // Remove optional (?) to make it required
  notes?: string;
  customer_id?: string;
  password: string; // Make this required too
}

export interface AddressJSON {
  customer_name: string;
  phone: string;
  address_line_1: string;
  city: string;
  postal_code?: string;
  country?: string;
}

export interface OrderProduct {
  product_id: string;
  variant_id?: string;
  product_name: string;
  variant_details?: Record<string, any>;
  quantity: number;
  unit_price: number;
  total_price: number;
  variant_name?: string | null;
}

export interface Order {
  order_number: string;
  customer_id?: string; // Now optional
  store_id: string;
  status: "pending" | "confirmed" | "completed" | "cancelled";
  subtotal: number;
  tax_amount?: number;
  shipping_fee: number;
  total_amount: number;
  currency?: string;
  payment_status?: "pending" | "paid" | "failed" | "refunded";
  payment_method?: string;
  shipping_address: AddressJSON;
  billing_address?: AddressJSON;
  notes?: string;
  order_items: OrderProduct[];
}