/* eslint-disable @typescript-eslint/no-explicit-any */
import { getProductsWithVariants, ProductWithVariants } from "./products/getProductsWithVariants";
import { getStoreCustomersSimple, StoreCustomer } from "./customers/getStoreCustomersSimple";
import { getCustomerProfile, CustomerProfile } from "./customers/getCustomerProfile";
import { createCustomer, CreateCustomerData } from "./customers/createCustomer";
import { createOrder, CreateOrderData, CreateOrderResult } from "./orders/orderService";

export interface DataService {
  // Product methods
  getProductsWithVariants: (storeId: string) => Promise<ProductWithVariants[]>;
  
  // Customer methods
  getStoreCustomersSimple: (storeId: string) => Promise<StoreCustomer[]>;
  getCustomerProfile: (customerId: string) => Promise<CustomerProfile | null>;
  createCustomer: (customerData: CreateCustomerData) => Promise<any>;
  
  // Order methods
  createOrder: (orderData: CreateOrderData) => Promise<CreateOrderResult>;
}

export const dataService: DataService = {
  getProductsWithVariants,
  getStoreCustomersSimple,
  getCustomerProfile,
  createCustomer,
  createOrder,
};

export default dataService;