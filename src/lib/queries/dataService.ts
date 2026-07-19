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
import { deleteOrder } from "@/lib/queries/orders/deleteOrder";
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
  getProductsWithVariants: (options: {
    storeId: string;
    search?: string;
    page?: number;
    pageSize?: number;
  }) => Promise<{ data: ProductWithVariants[]; total: number }>;
  createCustomer: (customerData: CreateCustomerData) => Promise<any>;
  getCustomerProfileByStoreCustomerId: (
    storeCustomerId: string
  ) => Promise<CustomerProfile | null>;
  getStoreById: (storeId: string) => Promise<{ data: any; error: any }>;
  createOrder: (orderData: CreateOrderData) => Promise<CreateOrderResult>;
  getStoreOrders: (options: GetStoreOrdersOptions) => Promise<{
    orders: StoreOrder[];
    total: number; // filtered (pagination)
    totalOrders: number; // store-wide
    totalByOrderStatus: Record<string, number>; // NEW
    totalByPaymentStatus: Record<string, number>; // NEW
  }>;
  getOrderByNumber: (
    storeId: string,
    orderNumber: string
  ) => Promise<OrderWithItems | null>;
  deleteOrder: (
    orderId: string
  ) => Promise<{ success: boolean; error?: string }>;
  getAllStoreCustomers: (storeId: string) => Promise<DetailedCustomer[]>; // Keep this signature
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

const deleteOrderImpl = deleteOrder;

// --- Wrapper for getStoreOrders — delegates search/filter/pagination to the
// database (see getStoreOrders.ts) instead of fetching the store's entire
// order history and slicing it in memory on every page/search/filter change. ---
const getStoreOrdersImpl = async (
  options: GetStoreOrdersOptions
): Promise<{
  orders: StoreOrder[];
  total: number;
  totalOrders: number;
  totalByOrderStatus: Record<string, number>;
  totalByPaymentStatus: Record<string, number>;
}> => {
  const { storeId, search, page = 1, pageSize = 10, filters } = options;

  const normalizedFilters: { status?: string; payment_status?: string } = {};
  if (filters?.status && filters.status !== "all")
    normalizedFilters.status = filters.status;
  if (filters?.payment_status && filters.payment_status !== "all")
    normalizedFilters.payment_status = filters.payment_status;

  return originalGetStoreOrders(
    storeId,
    search,
    page,
    pageSize,
    normalizedFilters
  );
};

// --- Wrapper for getAllStoreCustomers to maintain backward compatibility ---
const getAllStoreCustomersWrapper = async (
  storeId: string
): Promise<DetailedCustomer[]> => {
  try {
    // Call the new function without pagination parameters to get the simple array
    const result = await getAllStoreCustomers(storeId);

    // If it returns a PaginatedCustomers object, extract the customers array
    if (result && typeof result === "object" && "customers" in result) {
      return result.customers;
    }

    // Otherwise it's already the array
    return result as DetailedCustomer[];
  } catch (error) {
    console.error("Error in getAllStoreCustomersWrapper:", error);
    throw error;
  }
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
  getAllStoreCustomers: getAllStoreCustomersWrapper, // Use the wrapper
  getCustomerProfileByStoreCustomerId,
};

export default dataService;
