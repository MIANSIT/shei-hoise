/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabaseAdmin } from "@/lib/supabase";

export interface OrderWithItems {
  id: string;
  order_number: string;
  customer_id: string;
  store_id: string;
  status: "pending" | "confirmed" | "completed" | "cancelled" | "shipped";
  subtotal: number;
  tax_amount: number;
  shipping_fee: number;
  total_amount: number;
  currency: string;
  payment_status: "pending" | "paid" | "failed" | "refunded";
  payment_method: string;
  shipping_address: any;
  billing_address: any;
  notes: string;
  delivery_option: string;
  created_at: string;
  updated_at: string;
  customer?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    user_type: string;
    is_active: boolean;
  };
  customer_profile?: {
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
    console.log("Fetching order:", { storeId, orderNumber });

    // Get the main order data
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

    // Get customer data from users table
    let customer = null;
    if (order.customer_id) {
      const { data: userData, error: userError } = await supabaseAdmin
        .from("users")
        .select("*")
        .eq("id", order.customer_id)
        .single();

      if (!userError && userData) {
        customer = userData;
      }
    }

    // Get customer profile from user_profiles table
    let customerProfile = null;
    if (order.customer_id) {
      const { data: profile, error: profileError } = await supabaseAdmin
        .from("user_profiles")
        .select("*")
        .eq("user_id", order.customer_id)
        .single();

      if (!profileError && profile) {
        customerProfile = profile;
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
      customer: customer,
      customer_profile: customerProfile,
      order_items: orderItems || [],
    };

    console.log("Order fetched successfully:", orderWithItems);

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
