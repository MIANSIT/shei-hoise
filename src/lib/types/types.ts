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
  };
  products: Product[];
  status: "pending" | "processing" | "shipped" | "delivered" | "cancelled";
  orderDate: string;
  deliveryOption: "Pathao" | "Courier" | "Other";
  paymentMethod: "COD" | "Online";
  paymentStatus: "paid" | "pending" | "failed";
}
