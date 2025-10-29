/* eslint-disable @typescript-eslint/no-explicit-any */
// schema/orderSchema.ts
export interface CustomerInfo {
  name: string;
  phone: string;
  deliveryMethod: string;
  city: string;
  address: string;
}

export interface AddressJSON {
  customer_name: string;
  phone: string;
  address_line_1: string;
  city: string;
  postal_code?: string;
  country?: string;
}

export interface OrderItem {
  product_id: string;        // UUID from products table
  variant_id?: string;       // UUID from product_variants table
  product_name: string;
  variant_details?: Record<string, any>; // color/size/etc
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface Order {
  order_number: string;
  customer_id: string;       // UUID from users table
  store_id: string;          // UUID of store creating the order
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
  order_items: OrderItem[];
}
