/* eslint-disable @typescript-eslint/no-explicit-any */
import { getProductsWithVariants, ProductWithVariants } from "./products/getProductsWithVariants";
import { getStoreCustomersSimple, StoreCustomer } from "./customers/getStoreCustomersSimple";
import { getCustomerProfile, CustomerProfile } from "./customers/getCustomerProfile";
import { createCustomer, CreateCustomerData } from "./customers/createCustomer";
import { createOrder, CreateOrderData, CreateOrderResult } from "./orders/orderService";
import { getStoreOrders } from "./orders/getStoreOrders";
import { 
  updateOrder, 
  updateOrderStatus, 
  updatePaymentStatus, 
  updateDeliveryOption, 
  updatePaymentMethod, 
  updateOrderNotes,
  UpdateOrderData,
  UpdateOrderResult 
} from "./orders/updateOrder";
import { StoreOrder, OrderStatus, PaymentStatus, DeliveryOption, PaymentMethod } from "@/lib/types/order";

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
  
  // Order update methods - Fixed types
  updateOrder: (orderId: string, updates: UpdateOrderData) => Promise<UpdateOrderResult>;
  updateOrderStatus: (orderId: string, status: OrderStatus) => Promise<UpdateOrderResult>;
  updatePaymentStatus: (orderId: string, paymentStatus: PaymentStatus) => Promise<UpdateOrderResult>;
  updateDeliveryOption: (orderId: string, deliveryOption: DeliveryOption) => Promise<UpdateOrderResult>;
  updatePaymentMethod: (orderId: string, paymentMethod: PaymentMethod) => Promise<UpdateOrderResult>;
  updateOrderNotes: (orderId: string, notes: string) => Promise<UpdateOrderResult>;
}

export const dataService: DataService = {
  getProductsWithVariants,
  getStoreCustomersSimple,
  getCustomerProfile,
  createCustomer,
  createOrder,
  getStoreOrders,
  updateOrder,
  updateOrderStatus,
  updatePaymentStatus,
  updateDeliveryOption,
  updatePaymentMethod,
  updateOrderNotes,
};

export default dataService;