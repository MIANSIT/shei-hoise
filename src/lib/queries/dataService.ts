/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  getProductsWithVariants,
  ProductWithVariants,
} from "./products/getProductsWithVariants";
import { getCustomerProfileByStoreCustomerId } from "./customers/getCustomerProfile";
import { createCustomer, CreateCustomerData } from "./customers/createCustomer";
import {
  createOrder,
  CreateOrderData,
  CreateOrderResult,
} from "./orders/orderService";
import {
  getStoreOrders as originalGetStoreOrders,
  StoreOrder,
  GetStoreOrdersOptions,
} from "./orders/getStoreOrders";

import {
  updateOrder,
  updateOrderStatus,
  updatePaymentStatus,
  updateDeliveryOption,
  updatePaymentMethod,
  updateOrderNotes,
  UpdateOrderData,
  UpdateOrderResult,
} from "./orders/updateOrder";
import {
  getOrderByNumber,
  type OrderWithItems,
} from "./orders/getOrderByNumber";
import {
  updateOrderByNumber,
  type UpdateOrderByNumberData,
} from "./orders/updateOrderByNumber";
import {
  bulkUpdateOrders,
  BulkUpdateData,
  BulkUpdateResult,
} from "./orders/bulkUpdateOrders";
import { getAllStoreCustomers } from "@/lib/queries/customers/getAllStoreCustomers";
import { DetailedCustomer } from "@/lib/types/users";
import { CustomerProfile } from "@/lib/types/customer";
import { supabase } from "@/lib/supabase";
import {
  OrderStatus,
  PaymentStatus,
  DeliveryOption,
  PaymentMethod,
} from "@/lib/types/enums";

export interface DataService {
  getProductsWithVariants: (storeId: string) => Promise<ProductWithVariants[]>;
  createCustomer: (customerData: CreateCustomerData) => Promise<any>;
  getCustomerProfileByStoreCustomerId: (
    storeCustomerId: string
  ) => Promise<CustomerProfile | null>;
  getStoreById: (storeId: string) => Promise<{ data: any; error: any }>;
  createOrder: (orderData: CreateOrderData) => Promise<CreateOrderResult>;
  getStoreOrders: (
    options: GetStoreOrdersOptions
  ) => Promise<{ orders: StoreOrder[]; total: number }>;
  getOrderByNumber: (
    storeId: string,
    orderNumber: string
  ) => Promise<OrderWithItems | null>;
  deleteOrder: (
    orderId: string
  ) => Promise<{ success: boolean; error?: string }>;
  getAllStoreCustomers: (storeId: string) => Promise<DetailedCustomer[]>;
  updateOrderByNumber: (
    updateData: UpdateOrderByNumberData
  ) => Promise<{ success: boolean; error?: string }>;
  updateOrder: (
    orderId: string,
    updates: UpdateOrderData
  ) => Promise<UpdateOrderResult>;
  updateOrderStatus: (
    orderId: string,
    status: OrderStatus
  ) => Promise<UpdateOrderResult>;
  updatePaymentStatus: (
    orderId: string,
    paymentStatus: PaymentStatus
  ) => Promise<UpdateOrderResult>;
  updateDeliveryOption: (
    orderId: string,
    deliveryOption: DeliveryOption
  ) => Promise<UpdateOrderResult>;
  updatePaymentMethod: (
    orderId: string,
    paymentMethod: PaymentMethod
  ) => Promise<UpdateOrderResult>;
  updateOrderNotes: (
    orderId: string,
    notes: string
  ) => Promise<UpdateOrderResult>;
  bulkUpdateOrders: (updateData: BulkUpdateData) => Promise<BulkUpdateResult>;
}

// --- Implementation functions ---

const getStoreByIdImpl = async (storeId: string) => {
  try {
    const { data, error } = await supabase
      .from("stores")
      .select("id, store_name, store_slug")
      .eq("id", storeId)
      .single();

    return { data, error };
  } catch (error: any) {
    console.error("Error in dataService.getStoreById:", error);
    return { data: null, error };
  }
};

const getOrderByNumberImpl = async (
  storeId: string,
  orderNumber: string
): Promise<OrderWithItems | null> => {
  try {
    const result = await getOrderByNumber(storeId, orderNumber);
    if (result.error) throw new Error(result.error);
    return result.data;
  } catch (error: any) {
    console.error("Error in dataService.getOrderByNumber:", error);
    throw error;
  }
};

const updateOrderByNumberImpl = async (
  updateData: UpdateOrderByNumberData
): Promise<{ success: boolean; error?: string }> => {
  try {
    const result = await updateOrderByNumber(updateData);
    if (!result.success) throw new Error(result.error);
    return { success: true };
  } catch (error: any) {
    console.error("Error in dataService.updateOrderByNumber:", error);
    return { success: false, error: error.message };
  }
};

const deleteOrderImpl = async (
  orderId: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { data: order, error: fetchError } = await supabase
      .from("orders")
      .select("id, order_number")
      .eq("id", orderId)
      .single();

    if (fetchError || !order)
      return { success: false, error: "Order not found" };

    const { error: itemsError } = await supabase
      .from("order_items")
      .delete()
      .eq("order_id", orderId);
    if (itemsError)
      return { success: false, error: "Failed to delete order items" };

    const { error: deleteError } = await supabase
      .from("orders")
      .delete()
      .eq("id", orderId);
    if (deleteError) return { success: false, error: "Failed to delete order" };

    console.log(
      `Order #${order.order_number} (ID: ${orderId}) deleted successfully`
    );
    return { success: true };
  } catch (error: any) {
    console.error("Error in dataService.deleteOrder:", error);
    return {
      success: false,
      error: error.message || "An unexpected error occurred",
    };
  }
};

// --- Our custom wrapper for getStoreOrders with search + pagination ---
const getStoreOrdersImpl = async (
  options: GetStoreOrdersOptions
): Promise<{ orders: StoreOrder[]; total: number }> => {
  const { storeId, search, page = 1, pageSize = 10 } = options;

  // Call your original query (unchanged)
  let orders: StoreOrder[] = await originalGetStoreOrders(storeId);

  // Filter by order_number if search exists
  if (search?.trim()) {
    const searchTerm = search.trim().toLowerCase();
    orders = orders.filter((o) =>
      o.order_number?.toLowerCase().includes(searchTerm)
    );
  }

  const total = orders.length;

  // Pagination
  const from = (page - 1) * pageSize;
  const to = from + pageSize;
  const paginatedOrders = orders.slice(from, to);

  return { orders: paginatedOrders, total };
};

// --- Export DataService ---
export const dataService: DataService = {
  getProductsWithVariants,
  createCustomer,
  getStoreById: getStoreByIdImpl,
  createOrder,
  getStoreOrders: getStoreOrdersImpl,
  getOrderByNumber: getOrderByNumberImpl,
  updateOrderByNumber: updateOrderByNumberImpl,
  deleteOrder: deleteOrderImpl,
  updateOrder,
  updateOrderStatus,
  updatePaymentStatus,
  updateDeliveryOption,
  updatePaymentMethod,
  updateOrderNotes,
  bulkUpdateOrders,
  getAllStoreCustomers,
  getCustomerProfileByStoreCustomerId,
};

export default dataService;
