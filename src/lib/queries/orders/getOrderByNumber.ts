/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabaseAdmin } from "@/lib/supabase";
import { OrderStatus, PaymentStatus } from "@/lib/types/enums"; // ✅ ADDED: Import enums

export interface OrderWithItems {
  id: string;
  order_number: string;
  customer_id: string;
  store_id: string;
  status: OrderStatus; // ✅ Using enum
  subtotal: number;
  tax_amount: number;
  discount_amount?: number;
  additional_charges?: number; 
  shipping_fee: number;
  total_amount: number;
  currency: string;
  payment_status: PaymentStatus; // ✅ Using enum
  payment_method: string;
  shipping_address: any;
  billing_address: any;
  notes: string;
  delivery_option: string;
  created_at: string;
  updated_at: string;
  customer?: {
    id: string;
    name: string;
    email: string;
    phone: string;
    profile_id?: string;
  };
  customer_profile?: {
    address: string;
    address_line_1: string;
    address_line_2: string;
    city: string;
    postal_code: string;
    country: string;
  };
  order_items: OrderItem[];
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  variant_id?: string;
  product_name: string;
  variant_details: any;
  quantity: number;
  unit_price: number;
  total_price: number;
  created_at: string;
}

export async function getOrderByNumber(
  storeId: string,
  orderNumber: string
): Promise<{ data: OrderWithItems | null; error?: string }> {
  try {

    // Get the main order data - INCLUDING discount_amount
    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .select("*")
      .eq("order_number", orderNumber)
      .eq("store_id", storeId)
      .single();

    if (orderError) {
      console.error("Error fetching order:", orderError);
      return {
        data: null,
        error: `Order not found: ${orderError.message}`,
      };
    }

    if (!order) {
      return {
        data: null,
        error: "Order not found",
      };
    }

    

    // Get customer data from store_customers table (NOT users table)
    let customer = null;
    if (order.customer_id) {
      const { data: storeCustomer, error: customerError } = await supabaseAdmin
        .from("store_customers")
        .select("id, name, email, phone, profile_id")
        .eq("id", order.customer_id)
        .single();

      if (!customerError && storeCustomer) {
        customer = {
          id: storeCustomer.id,
          name: storeCustomer.name,
          email: storeCustomer.email,
          phone: storeCustomer.phone,
          profile_id: storeCustomer.profile_id
        };
      } else {
      }
    }

    // Get customer profile from customer_profiles table (NOT user_profiles)
    let customerProfile = null;
    if (customer?.profile_id) {
      const { data: profile, error: profileError } = await supabaseAdmin
        .from("customer_profiles")
        .select("*")
        .eq("id", customer.profile_id)
        .single();

      if (!profileError && profile) {
        customerProfile = {
          address: profile.address,
          address_line_1: profile.address_line_1,
          address_line_2: profile.address_line_2,
          city: profile.city,
          postal_code: profile.postal_code,
          country: profile.country,
        };
      }
    } else if (order.customer_id) {
      // Try to get profile by store_customer_id as fallback
      const { data: profile, error: profileError } = await supabaseAdmin
        .from("customer_profiles")
        .select("*")
        .eq("store_customer_id", order.customer_id)
        .single();

      if (!profileError && profile) {
        customerProfile = {
          address: profile.address,
          address_line_1: profile.address_line_1,
          address_line_2: profile.address_line_2,
          city: profile.city,
          postal_code: profile.postal_code,
          country: profile.country,
        };
      }
    }

    // Get order items
    const { data: orderItems, error: itemsError } = await supabaseAdmin
      .from("order_items")
      .select("*")
      .eq("order_id", order.id)
      .order("created_at", { ascending: true });

    if (itemsError) {
      console.error("Error fetching order items:", itemsError);
      return {
        data: null,
        error: `Failed to fetch order items: ${itemsError.message}`,
      };
    }

    // Combine order, customer data, customer profile, and items
    const orderWithItems: OrderWithItems = {
      ...order,
      status: order.status as OrderStatus, // ✅ Type casting to enum
      payment_status: order.payment_status as PaymentStatus, // ✅ Type casting to enum
      customer: customer,
      customer_profile: customerProfile,
      order_items: orderItems || [],
    };

    

    return {
      data: orderWithItems,
    };
  } catch (error: any) {
    console.error("Error in getOrderByNumber:", error);
    return {
      data: null,
      error: error.message || "Unknown error occurred while fetching order",
    };
  }
}