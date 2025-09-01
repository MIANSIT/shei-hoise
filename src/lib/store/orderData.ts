// lib/data/orders.ts

import { Order } from "../types/types";

export const initialOrders: Order[] = [
  {
    id: 1,
    user: {
      name: "John Doe",
      email: "john@example.com",
      avatar: "https://i.pravatar.cc/40?img=1",
      address: "123 Main Street",
      city: "Dhaka",
      country: "Bangladesh",
      phone: "+880123456789",
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
      address: "456 Park Avenue",
      city: "Chittagong",
      country: "Bangladesh",
      phone: "+880987654321",
    },
    products: [{ title: "MacBook Pro 14”", quantity: 1, price: 2200 }],
    status: "delivered",
    orderDate: "2025-08-20",
    deliveryOption: "Courier",
    paymentMethod: "COD",
    paymentStatus: "paid",
  },
];
