import { Order } from "@/lib/types/types";

export const initialOrders: Order[] = [
  {
    id: 1,
    user: {
      name: "John Doe",
      email: "john@example.com",
      avatar: "https://i.pravatar.cc/40?img=1",
    },
    products: [
      { title: "iPhone 15", quantity: 1, price: 1200 },
      { title: "AirPods Pro", quantity: 2, price: 250 },
    ],
    status: "processing",
    orderDate: "2025-08-25",
    deliveryOption: "Pathao",
    paymentMethod: "Online",
    paymentStatus: "pending",
  },
  {
    id: 2,
    user: {
      name: "Sarah Smith",
      email: "sarah@example.com",
      avatar: "https://i.pravatar.cc/40?img=2",
    },
    products: [{ title: "MacBook Pro 14”", quantity: 1, price: 2200 }],
    status: "delivered",
    orderDate: "2025-08-20",
    deliveryOption: "Courier",
    paymentMethod: "COD",
    paymentStatus: "paid",
  },
];
