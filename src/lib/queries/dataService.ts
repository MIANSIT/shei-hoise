/* eslint-disable @typescript-eslint/no-explicit-any */
import { getProductsWithVariants, ProductWithVariants } from "./products/getProductsWithVariants";
import { getStoreCustomersSimple, StoreCustomer } from "./customers/getStoreCustomersSimple";
import { getCustomerProfile, CustomerProfile } from "./customers/getCustomerProfile";
import { createCustomer, CreateCustomerData } from "./customers/createCustomer";
import { createOrder, CreateOrderData, CreateOrderResult } from "./orders/orderService";
import { getStoreOrders } from "./orders/getStoreOrders";
import { StoreOrder } from "@/lib/types/order";

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
}

export const dataService: DataService = {
  getProductsWithVariants,
  getStoreCustomersSimple,
  getCustomerProfile,
  createCustomer,
  createOrder,
  getStoreOrders,
};

export default dataService;