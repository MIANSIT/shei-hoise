/* eslint-disable @typescript-eslint/no-explicit-any */

// ===== CORE ORDER TYPES =====
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

export interface AddressJSON {
  customer_name: string;
  phone: string;
  email?: string;
  address_line_1: string;
  city: string;
  postal_code?: string;
  country?: string;
}

export interface OrderCustomer {
  id: string;
  first_name: string;
  email: string;
  phone: string | null;
}

export interface ProductImage {
  id: string;
  image_url: string;
  is_primary: boolean;
}

export interface OrderItemProduct {
  id: string;
  name: string;
  product_images?: ProductImage[];
}

export interface OrderItemVariant {
  id: string;
  product_images?: ProductImage[];
}

export interface OrderItem {
  id: string;
  product_id: string;
  variant_id: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  product_name: string;
  variant_details: any;
  products?: OrderItemProduct | null;
  product_variants?: OrderItemVariant | null;
  discounted_price?: number;
}

// ===== STATUS TYPES =====
export type OrderStatus =
  | "pending"
  | "confirmed"
  | "shipped"
  | "delivered"
  | "cancelled";
export type PaymentStatus = "pending" | "paid" | "failed" | "refunded";
export type DeliveryOption = "pathao" | "courier" | "other";
export type PaymentMethod = "cod" | "cash" | "online";

// ===== SUPABASE DATABASE TYPES =====
export interface StoreOrder {
  stores: any;
  id: string;
  order_number: string;
  customer_id: string | null;
  store_id: string;
  status: OrderStatus;
  subtotal: number;
  tax_amount: number;
  shipping_fee: number;
  total_amount: number;
  currency: string;
  payment_status: PaymentStatus;
  payment_method: string | null;
  shipping_address: {
    customer_name: string;
    phone: string;
    address_line_1: string;
    city: string;
    country: string;
  };
  billing_address: {
    customer_name: string;
    phone: string;
    address_line_1: string;
    city: string;
    country: string;
  } | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  order_items: OrderItem[];
  customers: OrderCustomer | null;
  delivery_option?: DeliveryOption;
  cancel_note?: string;
}

// ===== FORM DATA TYPES =====
export interface CustomerInfo {
  name: string; // Changed from string | null
  phone: string;
  address: string;
  deliveryMethod: string;
  deliveryOption: string;
  city: string;
  email: string;
  notes?: string;
  customer_id?: string;
  password: string;
  country?: string;
  postal_code: string; // Changed from string | null
}

export interface CreateOrderData {
  storeId: string;
  orderNumber: string;
  customerInfo: CustomerInfo;
  orderProducts: OrderProduct[];
  subtotal: number;
  taxAmount: number;
  discount: number;
  deliveryCost: number;
  totalAmount: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: string;
  currency?: string;
  deliveryOption: string;
}

// ===== CUSTOMER ORDER TYPES =====
export interface CustomerOrderData {
  storeId: string;
  orderNumber: string;
  customerInfo: {
    name: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    country?: string;
    customer_id?: string;
  };
  orderProducts: OrderProduct[];
  subtotal: number;
  taxAmount: number;
  discount: number;
  deliveryCost: number;
  totalAmount: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: string;
  currency?: string;
  deliveryOption: string;
}
