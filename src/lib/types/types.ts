// lib/types/types.ts

export interface Product {
  title: string;
  quantity: number;
  price: number;
  key?: string;
}

export interface Order {
  id: number;
  user: {
    name: string;
    email: string;
    avatar?: string;
    address?: string;
    phone?: string; // Added phone number
    city?: string;
    country?: string;
  };
  products: Product[];
  status: "pending" | "processing" | "shipped" | "delivered" | "cancelled";
  orderDate: string;
  deliveryOption: "Pathao" | "Courier" | "Other";
  paymentMethod: "COD" | "Online";
  paymentStatus: "paid" | "pending" | "failed";
  deliveryCost: number;
  cancelNote?: string; // <--- add this line
}
