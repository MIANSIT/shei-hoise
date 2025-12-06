// lib/types/invoice.ts
import { CartProductWithDetails, CartCalculations } from "./cart";

export interface InvoiceData {
  orderId: string;
  customerInfo: {
    name: string;
    email: string;
    phone: string;
    shippingAddress: string;
    city: string;
    country: string;
    postCode: string;
  };
  orderItems: CartProductWithDetails[];
  calculations: CartCalculations;
  shippingMethod: string;
  shippingFee: number;
  paymentMethod: string;
  storeSlug: string;
  orderDate: Date;
}