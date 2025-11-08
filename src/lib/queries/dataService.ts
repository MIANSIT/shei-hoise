/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  getProductsWithVariants,
  ProductWithVariants,
} from "./products/getProductsWithVariants";
import {
  getStoreCustomersSimple,
  StoreCustomer,
} from "./customers/getStoreCustomersSimple";
import {
  getCustomerProfile,
  CustomerProfile,
} from "./customers/getCustomerProfile";
import { createCustomer, CreateCustomerData } from "./customers/createCustomer";
import {
  createOrder,
  CreateOrderData,
  CreateOrderResult,
} from "./orders/orderService";
import { getStoreOrders } from "./orders/getStoreOrders";
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
  StoreOrder,
  OrderStatus,
  PaymentStatus,
  DeliveryOption,
  PaymentMethod,
} from "@/lib/types/order";

import {
  bulkUpdateOrders,
  BulkUpdateData,
  BulkUpdateResult,
} from "./orders/bulkUpdateOrders";

export interface DataService {
  // Product methods
  getProductsWithVariants: (storeId: string) => Promise<ProductWithVariants[]>;

  // Customer methods
  getStoreCustomersSimple: (storeId: string) => Promise<StoreCustomer[]>;
  getCustomerProfile: (customerId: string) => Promise<CustomerProfile | null>;
  createCustomer: (customerData: CreateCustomerData) => Promise<any>;

  // Order methods
  createOrder: (orderData: CreateOrderData) => Promise<CreateOrderResult>;
  getStoreOrders: (storeId: string) => Promise<StoreOrder[]>;
  getOrderByNumber: (
    storeId: string,
    orderNumber: string
  ) => Promise<OrderWithItems | null>;
  updateOrderByNumber: (
    updateData: UpdateOrderByNumberData
  ) => Promise<{ success: boolean; error?: string }>;

  // Order update methods - Fixed types
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

// Implementation for getOrderByNumber
const getOrderByNumberImpl = async (
  storeId: string,
  orderNumber: string
): Promise<OrderWithItems | null> => {
  try {
    const result = await getOrderByNumber(storeId, orderNumber);

    if (result.error) {
      throw new Error(result.error);
    }

    return result.data;
  } catch (error: any) {
    console.error("Error in dataService.getOrderByNumber:", error);
    throw error;
  }
};

// Implementation for updateOrderByNumber
const updateOrderByNumberImpl = async (
  updateData: UpdateOrderByNumberData
): Promise<{ success: boolean; error?: string }> => {
  try {
    const result = await updateOrderByNumber(updateData);

    if (!result.success) {
      throw new Error(result.error);
    }

    return { success: true };
  } catch (error: any) {
    console.error("Error in dataService.updateOrderByNumber:", error);
    return { success: false, error: error.message };
  }
};

export const dataService: DataService = {
  getProductsWithVariants,
  getStoreCustomersSimple,
  getCustomerProfile,
  createCustomer,
  createOrder,
  getStoreOrders,
  getOrderByNumber: getOrderByNumberImpl,
  updateOrderByNumber: updateOrderByNumberImpl,
  updateOrder,
  updateOrderStatus,
  updatePaymentStatus,
  updateDeliveryOption,
  updatePaymentMethod,
  updateOrderNotes,
  bulkUpdateOrders,
};

export default dataService;
